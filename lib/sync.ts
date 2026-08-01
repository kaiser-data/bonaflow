import { useEffect } from 'react';

import { LIVE_POLL_MS } from '@/hooks/useLivePoll';
import { backendConfigured, bilt } from '@/lib/backend';
import {
  registerWriteBridge,
  useBonaFlowStore,
  type AudioAttachment,
  type DietTag,
  type Dish,
  type DishAvailability,
  type EventInfo,
  type Incentive,
  type PendingWrite,
  type Priority,
  type QueueLevel,
  type ReplenishmentTask,
  type ReportAction,
  type ReportSource,
  type ReportWrite,
  type SharedSnapshot,
  type StaffUpdate,
  type Station,
  type StationAlert,
  type StationStatus,
  type TaskStatus,
} from '@/lib/store';

/**
 * Backend sync for the shared event state.
 *
 * Reads: every three seconds the whole shared dataset is fetched and the store
 * is hydrated with it, which is what makes the guest view on one phone follow a
 * staff report made on another. Polling is deliberate — no websockets, no
 * realtime subscriptions, because conference wifi drops them and a poll simply
 * catches up on the next tick.
 *
 * Writes: every change is applied to the local cache first so the reporting
 * screen never waits, then pushed to the backend and immediately followed by a
 * fetch, so what stays on screen is what the backend now holds.
 *
 * Failure: nothing here ever surfaces an error to a guest. A failed fetch is
 * ignored and the last known state stays on screen with its own timestamps. A
 * failed write is kept in an outbox and retried on every tick; while the outbox
 * is not empty, hydration is paused so a local-only change — the hidden demo
 * override with the network fully off — cannot be wiped by stale backend data.
 */

type StationRow = {
  id: string;
  code: string;
  name: string;
  location: string;
  queue: string;
  status: string;
  last_updated_at: string;
  sort_order: number;
};

type DishRow = {
  id: string;
  station_id: string;
  name: string;
  tags: string[] | null;
  availability: string;
  sort_order: number;
};

type UpdateRow = {
  id: string;
  station_id: string;
  dish_id: string | null;
  availability: string | null;
  queue: string | null;
  guests_waiting: number | null;
  action: string;
  priority: string;
  note: string | null;
  source: string;
  photo_uri: string | null;
  audio: unknown;
  created_at: string;
};

type AlertRow = {
  id: string;
  station_id: string;
  dish_id: string | null;
  priority: string;
  message: string;
  recommended_action: string;
  created_at: string;
};

type TaskRow = {
  id: string;
  station_id: string;
  dish_id: string | null;
  action: string;
  priority: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type EventRow = {
  id: string;
  name: string;
  venue: string;
  guests: number;
  service_start: string;
  service_end: string;
  incentive: unknown;
};

const DIET_TAGS: readonly string[] = ['vegan', 'vegetarian', 'gluten_free', 'halal'];
const AVAILABILITIES: readonly string[] = ['available', 'low', 'sold_out', 'uncertain'];
const STATUSES: readonly string[] = ['available', 'busy', 'closed', 'no_update'];
const QUEUES: readonly string[] = ['low', 'medium', 'high', 'unknown'];
const PRIORITIES: readonly string[] = ['low', 'medium', 'high'];
const ACTIONS: readonly string[] = [
  'replenish',
  'restock_soon',
  'add_staff',
  'close_station',
  'reopen_station',
  'none',
];
const SOURCES: readonly string[] = ['quick_action', 'text', 'voice', 'manual_override'];

function asDietTags(value: string[] | null): readonly DietTag[] {
  return (value ?? []).filter((tag): tag is DietTag => DIET_TAGS.includes(tag));
}

function asAvailability(value: string | null): DishAvailability | null {
  return value !== null && AVAILABILITIES.includes(value) ? (value as DishAvailability) : null;
}

function asStatus(value: string): StationStatus {
  return STATUSES.includes(value) ? (value as StationStatus) : 'no_update';
}

function asQueue(value: string | null): QueueLevel | null {
  return value !== null && QUEUES.includes(value) ? (value as QueueLevel) : null;
}

function asPriority(value: string): Priority {
  return PRIORITIES.includes(value) ? (value as Priority) : 'low';
}

function asAction(value: string): ReportAction {
  return ACTIONS.includes(value) ? (value as ReportAction) : 'none';
}

function asSource(value: string): ReportSource {
  return SOURCES.includes(value) ? (value as ReportSource) : 'text';
}

function asTaskStatus(value: string): TaskStatus {
  return value === 'done' ? 'done' : 'open';
}

function asAudio(value: unknown): AudioAttachment | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.uri !== 'string') return null;
  return {
    uri: record.uri,
    extension: typeof record.extension === 'string' ? record.extension : '',
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream',
    durationMs: typeof record.durationMs === 'number' ? record.durationMs : 0,
  };
}

function asIncentive(value: unknown): Incentive | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.text !== 'string' || typeof record.appliesToStationId !== 'string') return null;
  return {
    active: record.active === true,
    text: record.text,
    appliesToStationId: record.appliesToStationId,
    authorizedBy: typeof record.authorizedBy === 'string' ? record.authorizedBy : 'event_organiser',
    expiresAt: typeof record.expiresAt === 'string' ? record.expiresAt : '',
  };
}

function toStations(stationRows: StationRow[], dishRows: DishRow[]): readonly Station[] {
  return stationRows.map((row) => {
    const dishes: readonly Dish[] = dishRows
      .filter((dish) => dish.station_id === row.id)
      .map((dish) => ({
        id: dish.id,
        name: dish.name,
        tags: asDietTags(dish.tags),
        availability: asAvailability(dish.availability) ?? 'uncertain',
      }));

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      location: row.location,
      queue: asQueue(row.queue) ?? 'unknown',
      status: asStatus(row.status),
      dishes,
      lastUpdatedAt: row.last_updated_at,
    };
  });
}

function toUpdate(row: UpdateRow): StaffUpdate {
  return {
    id: row.id,
    stationId: row.station_id,
    dishId: row.dish_id,
    availability: asAvailability(row.availability),
    queue: asQueue(row.queue),
    guestsWaiting: row.guests_waiting,
    action: asAction(row.action),
    priority: asPriority(row.priority),
    note: row.note ?? '',
    source: asSource(row.source),
    photoUri: row.photo_uri,
    audio: asAudio(row.audio),
    createdAt: row.created_at,
  };
}

function toAlert(row: AlertRow): StationAlert {
  return {
    id: row.id,
    stationId: row.station_id,
    dishId: row.dish_id,
    priority: asPriority(row.priority),
    message: row.message,
    recommendedAction: row.recommended_action,
    createdAt: row.created_at,
  };
}

function toTask(row: TaskRow): ReplenishmentTask {
  return {
    id: row.id,
    stationId: row.station_id,
    dishId: row.dish_id,
    action: asAction(row.action),
    priority: asPriority(row.priority),
    status: asTaskStatus(row.status),
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function toEvent(row: EventRow, fallback: EventInfo): EventInfo {
  return {
    name: row.name,
    venue: row.venue,
    guests: row.guests,
    serviceStart: row.service_start,
    serviceEnd: row.service_end,
    incentive: asIncentive(row.incentive) ?? fallback.incentive,
  };
}

const RECENT_ROW_LIMIT = 200;

/**
 * Fetches the whole shared dataset. Returns null on any failure, which the
 * caller reads as "keep the last known state" — never as an error to show.
 */
async function fetchSnapshot(): Promise<SharedSnapshot | null> {
  if (!backendConfigured) return null;

  try {
    const [eventResult, stationResult, dishResult, updateResult, alertResult, taskResult] =
      await Promise.all([
        bilt.from('event_config').select('*').eq('id', 'event').limit(1),
        bilt.from('stations').select('*').order('sort_order', { ascending: true }),
        bilt.from('dishes').select('*').order('sort_order', { ascending: true }),
        bilt
          .from('staff_updates')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(RECENT_ROW_LIMIT),
        bilt
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(RECENT_ROW_LIMIT),
        bilt
          .from('replenishment_tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(RECENT_ROW_LIMIT),
      ]);

    const failed = [
      eventResult.error,
      stationResult.error,
      dishResult.error,
      updateResult.error,
      alertResult.error,
      taskResult.error,
    ].some((error) => error !== null);
    if (failed) return null;

    const stationRows = (stationResult.data ?? []) as StationRow[];
    // An empty table would blank every screen, so it is treated as no answer.
    if (stationRows.length === 0) return null;

    const eventRows = (eventResult.data ?? []) as EventRow[];
    const currentEvent = useBonaFlowStore.getState().event;

    return {
      event: eventRows.length > 0 ? toEvent(eventRows[0], currentEvent) : currentEvent,
      stations: toStations(stationRows, (dishResult.data ?? []) as DishRow[]),
      updates: ((updateResult.data ?? []) as UpdateRow[]).map(toUpdate),
      alerts: ((alertResult.data ?? []) as AlertRow[]).map(toAlert),
      tasks: ((taskResult.data ?? []) as TaskRow[]).map(toTask),
    };
  } catch {
    return null;
  }
}

/** 'retry' means the backend was unreachable; 'drop' means it refused the row. */
type PushOutcome = 'ok' | 'retry' | 'drop';

function outcomeFromError(error: { message?: string } | null): PushOutcome {
  return error === null ? 'ok' : 'drop';
}

/**
 * Pushes a confirmed report in the documented order: update, dish availability,
 * station status, alert, then task. Every insert is an upsert on the id the
 * device generated, so a retry after a dropped connection cannot duplicate it.
 */
async function pushReport(write: ReportWrite): Promise<PushOutcome> {
  const { update, station, alert, task } = write;

  const updateResult = await bilt.from('staff_updates').upsert({
    id: update.id,
    station_id: update.stationId,
    dish_id: update.dishId,
    availability: update.availability,
    queue: update.queue,
    guests_waiting: update.guestsWaiting,
    action: update.action,
    priority: update.priority,
    note: update.note,
    source: update.source,
    photo_uri: update.photoUri,
    audio: update.audio,
    created_at: update.createdAt,
  });
  if (updateResult.error !== null) return outcomeFromError(updateResult.error);

  if (station !== null) {
    if (update.dishId !== null && update.availability !== null) {
      const dishResult = await bilt
        .from('dishes')
        .update({ availability: update.availability })
        .eq('id', update.dishId);
      if (dishResult.error !== null) return outcomeFromError(dishResult.error);
    }

    const stationResult = await bilt
      .from('stations')
      .update({
        queue: station.queue,
        status: station.status,
        last_updated_at: station.lastUpdatedAt,
      })
      .eq('id', station.id);
    if (stationResult.error !== null) return outcomeFromError(stationResult.error);
  }

  const alertResult = await bilt.from('alerts').upsert({
    id: alert.id,
    station_id: alert.stationId,
    dish_id: alert.dishId,
    priority: alert.priority,
    message: alert.message,
    recommended_action: alert.recommendedAction,
    created_at: alert.createdAt,
  });
  if (alertResult.error !== null) return outcomeFromError(alertResult.error);

  if (task !== null) {
    const taskResult = await bilt.from('replenishment_tasks').upsert({
      id: task.id,
      station_id: task.stationId,
      dish_id: task.dishId,
      action: task.action,
      priority: task.priority,
      status: task.status,
      created_at: task.createdAt,
      completed_at: task.completedAt,
    });
    if (taskResult.error !== null) return outcomeFromError(taskResult.error);
  }

  return 'ok';
}

async function push(write: PendingWrite): Promise<PushOutcome> {
  if (!backendConfigured) return 'retry';

  try {
    if (write.kind === 'report') return await pushReport(write);

    if (write.kind === 'task_completed') {
      const result = await bilt
        .from('replenishment_tasks')
        .update({ status: 'done', completed_at: write.completedAt })
        .eq('id', write.taskId);
      return outcomeFromError(result.error);
    }

    const result = await bilt
      .from('event_config')
      .update({ incentive: write.incentive })
      .eq('id', 'event');
    return outcomeFromError(result.error);
  } catch {
    // Network failure: keep the change and try again on the next tick.
    return 'retry';
  }
}

/** Writes the backend has not accepted yet. Oldest first, applied in order. */
const outbox: PendingWrite[] = [];

let inFlight = false;
let rerunRequested = false;
let lastSignature = '';

function hydrateIfChanged(snapshot: SharedSnapshot): void {
  const signature = JSON.stringify(snapshot);
  if (signature === lastSignature) return;
  lastSignature = signature;
  useBonaFlowStore.getState().hydrate(snapshot);
}

/** Drains the outbox in order. False means the backend is still unreachable. */
async function drainOutbox(): Promise<boolean> {
  while (outbox.length > 0) {
    const outcome = await push(outbox[0]);
    if (outcome === 'retry') return false;
    // 'ok' and 'drop' both leave the outbox: a refused row is not retried
    // forever, and the next fetch shows what the backend actually holds.
    outbox.shift();
  }
  return true;
}

/**
 * One sync pass: send anything outstanding, then refresh. Overlapping passes are
 * skipped, so a slow network cannot queue up work or leave a spinner behind; a
 * pass requested while one is running is run again straight afterwards.
 */
async function runSync(): Promise<void> {
  if (inFlight) {
    rerunRequested = true;
    return;
  }
  inFlight = true;
  try {
    const drained = await drainOutbox();
    // A local-only change is still waiting, so backend data would be stale.
    if (!drained) return;
    const snapshot = await fetchSnapshot();
    // A write that arrived mid-fetch is not yet in this answer; hydrating now
    // would briefly undo it on screen, so it waits for the next pass.
    if (snapshot !== null && outbox.length === 0) hydrateIfChanged(snapshot);
  } finally {
    inFlight = false;
    if (rerunRequested) {
      rerunRequested = false;
      void runSync();
    }
  }
}

registerWriteBridge((write) => {
  outbox.push(write);
  // Post first, then refresh from what the backend returns.
  void runSync();
});

/**
 * Starts the three-second poll for the lifetime of the app. Mounted once in the
 * root layout, so a single loop serves every screen on the device.
 */
export function useBackendSync(intervalMs: number = LIVE_POLL_MS): void {
  useEffect(() => {
    void runSync();
    const timer = setInterval(() => {
      void runSync();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}
