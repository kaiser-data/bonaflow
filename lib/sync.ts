import { useEffect } from 'react';

import { LIVE_POLL_MS } from '@/hooks/useLivePoll';
import { backendConfigured, bilt } from '@/lib/backend';
import { syncEventClock } from '@/lib/clock';
import {
  registerWriteBridge,
  useBonaFlowStore,
  type AudioAttachment,
  type DietTag,
  type Dish,
  type DishAvailability,
  type EventInfo,
  type FieldInference,
  type Incentive,
  type IssueType,
  type PendingWrite,
  type Priority,
  type QueueLevel,
  type ReplenishmentTask,
  type ReportAction,
  type ReportedFacts,
  type ReportSource,
  type ReportWrite,
  type SharedSnapshot,
  type StaffUpdate,
  type Station,
  type StationAlert,
  type StationStatus,
  type TaskStatus,
  type UpdateInterpretation,
} from '@/lib/store';

/**
 * Backend sync for the shared event state.
 *
 * Reads: every three seconds the whole shared dataset is fetched and the store
 * is hydrated with it, which is what makes the guest view on one phone follow a
 * staff report made on another. Polling is deliberate — no websockets, no
 * realtime subscriptions, because conference wifi drops long-lived connections
 * and a poll simply catches up on the next tick.
 *
 * Writes: the change is applied to the local cache first so the reporting screen
 * never waits, then posted to the backend, which returns the new shared state;
 * the store is hydrated from that response, so what stays on screen is what the
 * backend actually holds.
 *
 * Failures never reach a guest. A failed fetch is ignored and the last known
 * state stays on screen with its own timestamps — no blank screen, no spinner
 * that outlives one poll, no error screen. A write that could not be sent is
 * kept in an outbox and retried on every tick; while the outbox is not empty,
 * hydration is paused, so a local-only change — the hidden demo override with
 * the network fully off — cannot be wiped by backend data that predates it.
 *
 * Everything goes through four SQL functions (`bonaflow_state`,
 * `bonaflow_apply_report`, `bonaflow_complete_task`, `bonaflow_set_incentive`).
 * There are no users and no per-user rules: one event, one shared dataset.
 */

type StationRow = {
  id: string;
  code: string;
  name: string;
  location: string;
  queue: string;
  status: string;
  last_updated_at: string;
};

type DishRow = {
  id: string;
  station_id: string;
  name: string;
  tags: string[] | null;
  availability: string;
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
  interpretation: unknown;
  created_at: string;
};

type AlertRow = {
  id: string;
  station_id: string;
  dish_id: string | null;
  priority: string;
  message: string;
  recommended_action: string;
  update_id: string | null;
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
  name: string;
  venue: string;
  guests: number;
  service_start: string;
  service_end: string;
  incentive: unknown;
};

/** Exactly what `bonaflow_state()` returns. */
type StatePayload = {
  event: EventRow | null;
  stations: StationRow[] | null;
  dishes: DishRow[] | null;
  updates: UpdateRow[] | null;
  alerts: AlertRow[] | null;
  tasks: TaskRow[] | null;
};

const DIET_TAGS: readonly DietTag[] = ['vegan', 'vegetarian', 'gluten_free', 'halal'];
const AVAILABILITIES: readonly DishAvailability[] = ['available', 'low', 'sold_out', 'uncertain'];
const STATUSES: readonly StationStatus[] = ['available', 'busy', 'closed', 'no_update'];
const QUEUES: readonly QueueLevel[] = ['low', 'medium', 'high', 'unknown'];
const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];
const ACTIONS: readonly ReportAction[] = [
  'replenish',
  'restock_soon',
  'add_staff',
  'close_station',
  'reopen_station',
  'none',
];
const SOURCES: readonly ReportSource[] = ['quick_action', 'text', 'voice', 'manual_override'];
const ISSUE_TYPES: readonly IssueType[] = [
  'low_stock',
  'sold_out',
  'queue',
  'closure',
  'resolved',
  'other',
];

/**
 * Backend columns are plain text, so each value is matched against the set the
 * app accepts. Anything unrecognised falls back instead of being trusted.
 */
function match<T extends string>(options: readonly T[], value: string | null): T | null {
  return options.find((option) => option === value) ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return Object.fromEntries(Object.entries(value));
}

function asDietTags(value: string[] | null): readonly DietTag[] {
  return (value ?? [])
    .map((tag) => match(DIET_TAGS, tag))
    .filter((tag): tag is DietTag => tag !== null);
}

function asAvailability(value: string | null): DishAvailability | null {
  return match(AVAILABILITIES, value);
}

function asStatus(value: string): StationStatus {
  return match(STATUSES, value) ?? 'no_update';
}

function asQueue(value: string | null): QueueLevel | null {
  return match(QUEUES, value);
}

function asPriority(value: string): Priority {
  return match(PRIORITIES, value) ?? 'low';
}

function asAction(value: string): ReportAction {
  return match(ACTIONS, value) ?? 'none';
}

function asSource(value: string): ReportSource {
  return match(SOURCES, value) ?? 'text';
}

function asTaskStatus(value: string): TaskStatus {
  return value === 'done' ? 'done' : 'open';
}

function asAudio(value: unknown): AudioAttachment | null {
  const record = asRecord(value);
  if (record === null) return null;
  if (typeof record.uri !== 'string') return null;
  return {
    uri: record.uri,
    extension: typeof record.extension === 'string' ? record.extension : '',
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'application/octet-stream',
    durationMs: typeof record.durationMs === 'number' ? record.durationMs : 0,
  };
}

function asFacts(value: unknown): ReportedFacts | null {
  const record = asRecord(value);
  if (record === null) return null;
  return {
    availability: asAvailability(
      typeof record.availability === 'string' ? record.availability : '',
    ),
    queue: asQueue(typeof record.queue === 'string' ? record.queue : ''),
    stationClosed: record.stationClosed === true,
    stationReopened: record.stationReopened === true,
  };
}

function asInferences(value: unknown): readonly FieldInference[] {
  if (!Array.isArray(value)) return [];

  const inferences: FieldInference[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === null || typeof record.field !== 'string') continue;
    const confidence = typeof record.confidence === 'number' ? record.confidence : Number.NaN;
    if (!Number.isFinite(confidence)) continue;
    inferences.push({
      field: record.field,
      value: typeof record.value === 'string' ? record.value : '',
      confidence: Math.min(1, Math.max(0, confidence)),
      basis: typeof record.basis === 'string' ? record.basis : '',
    });
  }

  return inferences;
}

function asStrings(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** How a report was read, as it was stored with the update. */
function asInterpretation(value: unknown): UpdateInterpretation | null {
  const record = asRecord(value);
  if (record === null) return null;

  const redirectSource = record.redirectSource;

  return {
    mode: record.mode === 'model' ? 'model' : 'keyword',
    summary: asText(record.summary),
    issueType: match(ISSUE_TYPES, asText(record.issueType)) ?? 'other',
    confidence:
      typeof record.confidence === 'number' && Number.isFinite(record.confidence)
        ? Math.min(1, Math.max(0, record.confidence))
        : 0,
    facts: asFacts(record.facts),
    inferences: asInferences(record.inferences),
    suggestedAction: asText(record.suggestedAction),
    suggestedStationId:
      typeof record.suggestedStationId === 'string' ? record.suggestedStationId : null,
    redirectStationId:
      typeof record.redirectStationId === 'string' ? record.redirectStationId : null,
    redirectSource:
      redirectSource === 'model' || redirectSource === 'rule' ? redirectSource : 'none',
    suggestedAnnouncement: asText(record.suggestedAnnouncement),
    // Text only: the photo is never sent, so there is never an observation.
    observed: null,
    corrections: asStrings(record.corrections),
    reason: typeof record.reason === 'string' ? record.reason : null,
  };
}

function asIncentive(value: unknown): Incentive | null {
  const record = asRecord(value);
  if (record === null) return null;
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
    interpretation: asInterpretation(row.interpretation),
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
    updateId: row.update_id,
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

function toEvent(row: EventRow | null, fallback: EventInfo): EventInfo {
  if (row === null) return fallback;
  return {
    name: row.name,
    venue: row.venue,
    guests: row.guests,
    serviceStart: row.service_start,
    serviceEnd: row.service_end,
    incentive: asIncentive(row.incentive),
  };
}

/** Single narrowing point for the backend answer. */
function isStatePayload(value: unknown): value is StatePayload {
  const record = asRecord(value);
  return record !== null && Array.isArray(record.stations);
}

/**
 * Turns a backend answer into the shape the store holds. Returns null for an
 * answer that would blank the screens, so the last known state is kept instead.
 */
function toSnapshot(payload: unknown): SharedSnapshot | null {
  if (!isStatePayload(payload)) return null;
  const stationRows = payload.stations ?? [];
  if (stationRows.length === 0) return null;

  return {
    event: toEvent(payload.event, useBonaFlowStore.getState().event),
    stations: toStations(stationRows, payload.dishes ?? []),
    updates: (payload.updates ?? []).map(toUpdate),
    alerts: (payload.alerts ?? []).map(toAlert),
    tasks: (payload.tasks ?? []).map(toTask),
  };
}

/** Rows as the SQL functions expect them. */
function reportPayload(write: ReportWrite): Record<string, unknown> {
  const { update, station, alert, task } = write;

  return {
    update: {
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
      interpretation: update.interpretation,
      created_at: update.createdAt,
    },
    station:
      station === null
        ? null
        : {
            id: station.id,
            queue: station.queue,
            status: station.status,
            last_updated_at: station.lastUpdatedAt,
          },
    alert: {
      id: alert.id,
      station_id: alert.stationId,
      dish_id: alert.dishId,
      priority: alert.priority,
      message: alert.message,
      recommended_action: alert.recommendedAction,
      update_id: alert.updateId,
      created_at: alert.createdAt,
    },
    task:
      task === null
        ? null
        : {
            id: task.id,
            station_id: task.stationId,
            dish_id: task.dishId,
            action: task.action,
            priority: task.priority,
            status: task.status,
            created_at: task.createdAt,
            completed_at: task.completedAt,
          },
  };
}

/** 'retry' means the backend was unreachable; 'drop' means it refused the call. */
type PushOutcome = 'ok' | 'retry' | 'drop';

type PushResult = { outcome: PushOutcome; snapshot: SharedSnapshot | null };

async function call(name: string, args: Record<string, unknown> | undefined): Promise<PushResult> {
  if (!backendConfigured) return { outcome: 'retry', snapshot: null };

  try {
    const { data, error } = await bilt.rpc(name, args);
    if (error !== null) return { outcome: 'drop', snapshot: null };
    return { outcome: 'ok', snapshot: toSnapshot(data) };
  } catch {
    // Network failure. The caller keeps the last known state and tries again.
    return { outcome: 'retry', snapshot: null };
  }
}

async function fetchSnapshot(): Promise<SharedSnapshot | null> {
  const { snapshot } = await call('bonaflow_state', undefined);
  return snapshot;
}

/** Every write posts first and gets the new shared state back in the response. */
async function push(write: PendingWrite): Promise<PushResult> {
  if (write.kind === 'report') {
    return call('bonaflow_apply_report', { p_report: reportPayload(write) });
  }

  if (write.kind === 'task_completed') {
    return call('bonaflow_complete_task', {
      p_task_id: write.taskId,
      p_completed_at: write.completedAt,
    });
  }

  return call('bonaflow_set_incentive', { p_incentive: write.incentive });
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
  // Follow the furthest-along device so ages and expiry stay coherent.
  syncEventClock(newestTimestamp(snapshot));
  useBonaFlowStore.getState().hydrate(snapshot);
}

/** Newest timestamp anywhere in the shared state, used to align the demo clock. */
function newestTimestamp(snapshot: SharedSnapshot): string {
  const candidates = [
    ...snapshot.stations.map((station) => station.lastUpdatedAt),
    ...snapshot.updates.map((update) => update.createdAt),
    ...snapshot.alerts.map((alert) => alert.createdAt),
    ...snapshot.tasks.map((task) => task.createdAt),
  ];

  return candidates.reduce((newest, current) => (current > newest ? current : newest), '');
}

/**
 * Drains the outbox in order and returns the state after the last accepted
 * write, or null when the backend is still unreachable and something is waiting.
 */
async function drainOutbox(): Promise<{ drained: boolean; snapshot: SharedSnapshot | null }> {
  let snapshot: SharedSnapshot | null = null;

  while (outbox.length > 0) {
    const result = await push(outbox[0]);
    if (result.outcome === 'retry') return { drained: false, snapshot: null };
    // 'ok' and 'drop' both leave the outbox: a refused call is not retried
    // forever, and the next fetch shows what the backend actually holds.
    outbox.shift();
    snapshot = result.snapshot;
  }

  return { drained: true, snapshot };
}

/**
 * One sync pass: send anything outstanding, then refresh. Overlapping passes are
 * skipped, so a slow network cannot pile up work; a pass requested while one is
 * running happens straight afterwards.
 */
async function runSync(): Promise<void> {
  if (inFlight) {
    rerunRequested = true;
    return;
  }
  inFlight = true;

  try {
    const { drained, snapshot: written } = await drainOutbox();
    // A local-only change is still waiting, so backend data would be older than
    // what is on screen. Keep the screen as it is and retry on the next tick.
    if (!drained) return;

    const snapshot = written ?? (await fetchSnapshot());
    // A write that arrived mid-call is not in this answer yet; hydrating now
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
  // Post first, then hydrate from what the backend returns.
  void runSync();
});

/**
 * Starts the three-second poll for the lifetime of the app. Mounted once in the
 * root layout, so one loop serves every screen on the device.
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
