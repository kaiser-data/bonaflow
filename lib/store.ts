import { create } from 'zustand';

import { eventNowIso } from '@/lib/clock';
import { computeRecommendations, deriveStationStatus, describeUpdate } from '@/lib/stations';

/**
 * Single store for BonaFlow, and the only read path for every screen.
 *
 * The shared event data now lives in the backend; this store is the local cache
 * in front of it. `lib/sync.ts` hydrates it from the backend every three
 * seconds and pushes every write, so a report made on one phone reaches the
 * guest view on another phone without anyone touching it. Screens never talk to
 * the backend directly, and they keep working from the last known state when a
 * fetch fails.
 *
 * The seeded arrays below are the starting point held in memory: they are what
 * the app shows before the first successful fetch, and what it keeps showing if
 * the network is unavailable.
 */

export type AppMode = 'guest' | 'staff' | 'operations';

export type DietTag = 'vegan' | 'vegetarian' | 'gluten_free' | 'halal';

/** Active dietary filter. `all` means no filtering. */
export type DietFilter = 'all' | DietTag;

export type DishAvailability = 'available' | 'low' | 'sold_out' | 'uncertain';

/** Station status. Maps 1:1 to the reserved traffic-light colours. */
export type StationStatus = 'available' | 'busy' | 'closed' | 'no_update';

export type QueueLevel = 'low' | 'medium' | 'high' | 'unknown';

export type Priority = 'low' | 'medium' | 'high';

/** Recommended operational action attached to a report. */
export type ReportAction =
  | 'replenish'
  | 'restock_soon'
  | 'add_staff'
  | 'close_station'
  | 'reopen_station'
  | 'none';

export type ReportSource = 'quick_action' | 'text' | 'voice' | 'manual_override';

export type Dish = {
  id: string;
  name: string;
  tags: readonly DietTag[];
  availability: DishAvailability;
};

export type Station = {
  id: string;
  /** Short label used for the event floor plan, e.g. "A". */
  code: string;
  name: string;
  /** Human location label, e.g. "by the stairs". */
  location: string;
  queue: QueueLevel;
  status: StationStatus;
  dishes: readonly Dish[];
  /** ISO local timestamp of the last staff update. */
  lastUpdatedAt: string;
};

/** Attached audio, exactly as the recorder produced it on this device. */
export type AudioAttachment = {
  uri: string;
  /** Container extension read from the URI, never hardcoded. */
  extension: string;
  /** Mime type derived from that container, never hardcoded. */
  mimeType: string;
  durationMs: number;
};

/**
 * What a staff member reports, before anything is applied. Held in the store so
 * it survives navigation to the confirmation screen, but it never touches
 * stations, alerts or tasks until `commitDraft` runs.
 */
export type UpdateDraft = {
  stationId: string;
  dishId: string | null;
  availability: DishAvailability | null;
  queue: QueueLevel | null;
  guestsWaiting: number | null;
  action: ReportAction;
  priority: Priority;
  note: string;
  source: ReportSource;
  photoUri: string | null;
  audio: AudioAttachment | null;
};

/** What kind of situation a report describes. */
export type IssueType = 'low_stock' | 'sold_out' | 'queue' | 'closure' | 'resolved' | 'other';

/** A field the reading service concluded rather than heard. Always has a confidence. */
export type FieldInference = {
  field: string;
  value: string;
  /** 0 to 1. */
  confidence: number;
  /** The words it came from, in one short phrase. */
  basis: string;
};

/** Only what the staff member actually said. Never merged with the inferences. */
export type ReportedFacts = {
  availability: DishAvailability | null;
  queue: QueueLevel | null;
  stationClosed: boolean;
  stationReopened: boolean;
};

/**
 * How one report was read, kept with the report itself so operations can show
 * what was said apart from what was concluded, long after the staff member
 * confirmed it.
 *
 * The redirect fields record a decision made by plain code: the reading service
 * may *suggest* an alternative station, but it is only used after the app has
 * checked that the station really holds a matching dish marked available.
 * Otherwise the deterministic For You rule supplies the target. Code wins.
 */
export type UpdateInterpretation = {
  /** 'model' means the reading service answered; 'keyword' is the offline fallback. */
  mode: 'model' | 'keyword';
  /** One-line summary from the service. Empty in keyword mode. */
  summary: string;
  issueType: IssueType;
  /** The service's own confidence in the whole reading, 0 to 1. */
  confidence: number;
  /** What was heard. Null in keyword mode, which does not separate the two. */
  facts: ReportedFacts | null;
  /** What was concluded, each with a confidence. */
  inferences: readonly FieldInference[];
  /** Follow-up the service suggested. Display only — the alert text is code. */
  suggestedAction: string;
  /** Alternative station the service suggested, before code checked it. */
  suggestedStationId: string | null;
  /** Station guests are actually sent to, after the availability check. */
  redirectStationId: string | null;
  /** 'model' = suggestion verified, 'rule' = deterministic rule used, 'none' = nowhere to send. */
  redirectSource: 'model' | 'rule' | 'none';
  /** Wording the service proposed. Never spoken as is; kept for the record. */
  suggestedAnnouncement: string;
  /** Photo analysis. Always null: the photo is never sent to the service. */
  observed: string | null;
  /** Fields corrected before the answer was accepted, in plain language. */
  corrections: readonly string[];
  /** Why the offline fallback ran. Null in model mode. */
  reason: string | null;
};

export type StaffUpdate = UpdateDraft & {
  id: string;
  createdAt: string;
  /** How this report was read. Null for quick actions and the manual override. */
  interpretation: UpdateInterpretation | null;
};

export type StationAlert = {
  id: string;
  stationId: string;
  dishId: string | null;
  priority: Priority;
  message: string;
  recommendedAction: string;
  /** The staff update this alert came from, so operations can show its reading. */
  updateId: string | null;
  createdAt: string;
};

export type TaskStatus = 'open' | 'done';

export type ReplenishmentTask = {
  id: string;
  stationId: string;
  dishId: string | null;
  action: ReportAction;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
};

/**
 * Operational lever set by operations, never produced by a model. There are no
 * accounts, points, balances or codes in this app: redemption is simply showing
 * the recommendation screen at the station.
 */
export type Incentive = {
  active: boolean;
  text: string;
  appliesToStationId: string;
  authorizedBy: string;
  /** ISO 8601 */
  expiresAt: string;
};

export type EventInfo = {
  name: string;
  venue: string;
  guests: number;
  serviceStart: string;
  serviceEnd: string;
  incentive: Incentive | null;
};

/** Cached recommendation, recalculated for every dietary filter on each update. */
export type RecommendationRef = {
  stationId: string;
  dishId: string;
  reason: string;
};

const EVENT: EventInfo = {
  name: '8x Bella & Bona Mobile Hack',
  venue: 'Delta Campus, Berlin',
  guests: 250,
  serviceStart: '12:30',
  serviceEnd: '14:00',
  incentive: {
    active: true,
    text: 'Free coffee at Station C',
    appliesToStationId: 'station-c',
    authorizedBy: 'event_organiser',
    expiresAt: '2026-06-11T13:15:00',
  },
};

const SEEDED_STATIONS: readonly Station[] = [
  {
    id: 'station-a',
    code: 'A',
    name: 'Mediterranean Kitchen',
    location: 'main hall, left',
    queue: 'medium',
    status: 'available',
    lastUpdatedAt: '2026-06-11T12:41:00',
    dishes: [
      {
        id: 'dish-a1',
        name: 'Mediterranean Chicken Bowl',
        tags: ['halal'],
        availability: 'available',
      },
      {
        id: 'dish-a2',
        name: 'Roasted Vegetable Couscous',
        tags: ['vegetarian'],
        availability: 'available',
      },
    ],
  },
  {
    id: 'station-b',
    code: 'B',
    name: 'Green Kitchen',
    location: 'by the stairs',
    queue: 'high',
    status: 'busy',
    lastUpdatedAt: '2026-06-11T12:52:00',
    dishes: [
      {
        id: 'dish-b1',
        name: 'Vegan Thai Curry',
        tags: ['vegan', 'gluten_free'],
        availability: 'low',
      },
      { id: 'dish-b2', name: 'Tofu Rice Bowl', tags: ['vegan'], availability: 'available' },
    ],
  },
  {
    id: 'station-c',
    code: 'C',
    name: 'Pasta Corner',
    location: 'back room',
    queue: 'low',
    status: 'available',
    lastUpdatedAt: '2026-06-11T12:47:00',
    dishes: [
      {
        id: 'dish-c1',
        name: 'Seasonal Vegetable Pasta',
        tags: ['vegan', 'vegetarian'],
        availability: 'available',
      },
      {
        id: 'dish-c2',
        name: 'Tomato Basil Pasta',
        tags: ['vegetarian'],
        availability: 'available',
      },
    ],
  },
  {
    id: 'station-d',
    code: 'D',
    name: 'Grab & Go',
    location: 'near the entrance',
    queue: 'low',
    status: 'available',
    lastUpdatedAt: '2026-06-11T12:35:00',
    dishes: [
      { id: 'dish-d1', name: 'Sandwiches', tags: [], availability: 'available' },
      { id: 'dish-d2', name: 'Fruit', tags: ['vegan', 'vegetarian'], availability: 'available' },
      { id: 'dish-d3', name: 'Salads', tags: ['vegan', 'vegetarian'], availability: 'available' },
      { id: 'dish-d4', name: 'Drinks', tags: [], availability: 'available' },
    ],
  },
];

let idCounter = 0;

/**
 * Ids are generated on the device that creates the row, so a write can be
 * retried against the backend without duplicating anything, and two phones
 * reporting at the same time can never produce the same id.
 */
function makeId(prefix: string): string {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${random}`;
}

/** Shared event data as it comes back from the backend. */
export type SharedSnapshot = {
  event: EventInfo;
  stations: readonly Station[];
  updates: readonly StaffUpdate[];
  alerts: readonly StationAlert[];
  tasks: readonly ReplenishmentTask[];
};

/** A confirmed report, ready to be pushed to the backend. */
export type ReportWrite = {
  kind: 'report';
  update: StaffUpdate;
  /** The station as it now stands, including its dishes. */
  station: Station | null;
  alert: StationAlert;
  task: ReplenishmentTask | null;
};

/** Every change the backend needs to hear about. */
export type PendingWrite =
  | ReportWrite
  | { kind: 'task_completed'; taskId: string; completedAt: string }
  | { kind: 'incentive'; incentive: Incentive | null };

let writeBridge: ((write: PendingWrite) => void) | null = null;

/**
 * Connects the sync layer to the store without the store importing it, so the
 * store stays a plain cache with no network code in it.
 */
export function registerWriteBridge(handler: (write: PendingWrite) => void): void {
  writeBridge = handler;
}

function emitWrite(write: PendingWrite): void {
  writeBridge?.(write);
}

type BonaFlowState = {
  event: EventInfo;
  stations: readonly Station[];
  /** Every confirmed staff report, newest first. */
  updates: readonly StaffUpdate[];
  /** Alerts raised by confirmed reports, newest first. */
  alerts: readonly StationAlert[];
  /** Replenishment tasks, newest first. */
  tasks: readonly ReplenishmentTask[];
  /** Recommended station per dietary filter, recalculated on every update. */
  recommendations: Readonly<Record<DietFilter, RecommendationRef | null>>;
  /** Bumped on every mutation so pollers can detect a change cheaply. */
  revision: number;
  /** Event-clock time of the last successful backend fetch. Never blanks the UI. */
  lastSyncedAt: string | null;
  mode: AppMode | null;
  dietFilter: DietFilter;
  /** Station the staff member is currently reporting for. */
  selectedStationId: string;
  /** Pending report. Nothing in the shared data changes while this is set. */
  draft: UpdateDraft | null;
  /**
   * How the pending report was read — by the reading service or by the offline
   * keyword fallback — plus what was heard, what was concluded and with what
   * confidence. Saved with the report on confirm, so operations can show it.
   */
  draftInterpretation: UpdateInterpretation | null;
  setMode: (mode: AppMode | null) => void;
  setDietFilter: (filter: DietFilter) => void;
  selectStation: (stationId: string) => void;
  /** Replace the shared data with what the backend returned. */
  hydrate: (snapshot: SharedSnapshot) => void;
  /** Open the confirmation flow with an interpreted report. */
  startDraft: (draft: UpdateDraft, interpretation?: UpdateInterpretation | null) => void;
  patchDraft: (patch: Partial<UpdateDraft>) => void;
  clearDraft: () => void;
  /** Apply the pending draft, then clear it. */
  commitDraft: () => void;
  /** Apply a report straight away (quick actions, manual override). */
  applyReport: (draft: UpdateDraft) => void;
  completeTask: (taskId: string) => void;
  /** Operations lever: turn the seeded incentive on or off. */
  setIncentiveActive: (active: boolean) => void;
};

/**
 * The single write path for a confirmed report. Steps run in this exact order:
 *   1. save the update
 *   2. change that dish's availability
 *   3. change the station's status and lastUpdatedAt if warranted
 *   4. create an alert
 *   5. create a replenishment task
 *   6. recalculate the recommended station for each dietary filter
 * Steps 7 and 8 need no code: the guest and operations screens read this same
 * store, so they re-render as soon as it changes — on this device immediately,
 * on other devices on their next poll.
 *
 * It returns the local patch and the rows the backend must be told about, in
 * the same order, so the network layer never has to re-derive anything.
 */
function applyDraft(
  state: BonaFlowState,
  draft: UpdateDraft,
  interpretation: UpdateInterpretation | null,
): { patch: Partial<BonaFlowState>; write: ReportWrite } {
  const createdAt = eventNowIso();

  // 1. save the update, together with how it was read
  const update: StaffUpdate = { ...draft, id: makeId('update'), createdAt, interpretation };
  const updates = [update, ...state.updates];

  // 2. + 3. dish availability, then station status and lastUpdatedAt
  const stations = state.stations.map((station) => {
    if (station.id !== draft.stationId) return station;

    const { dishId, availability } = draft;
    const dishes =
      dishId !== null && availability !== null
        ? station.dishes.map((dish) => (dish.id === dishId ? { ...dish, availability } : dish))
        : station.dishes;

    const queue = draft.queue ?? station.queue;

    return {
      ...station,
      dishes,
      queue,
      status: deriveStationStatus({ dishes, queue, action: draft.action }),
      lastUpdatedAt: createdAt,
    };
  });

  const station = stations.find((entry) => entry.id === draft.stationId);
  const dish = station?.dishes.find((entry) => entry.id === draft.dishId) ?? null;
  const described = describeUpdate(update, station?.name ?? 'Station', dish?.name ?? null);

  // 4. create an alert
  const alert: StationAlert = {
    id: makeId('alert'),
    stationId: draft.stationId,
    dishId: draft.dishId,
    priority: draft.priority,
    message: described.alertMessage,
    recommendedAction: described.recommendedAction,
    updateId: update.id,
    createdAt,
  };
  const alerts: readonly StationAlert[] = [alert, ...state.alerts];

  // 5. create a replenishment task, unless the report needs no follow-up
  const task: ReplenishmentTask | null =
    draft.action === 'none'
      ? null
      : {
          id: makeId('task'),
          stationId: draft.stationId,
          dishId: draft.dishId,
          action: draft.action,
          priority: draft.priority,
          status: 'open',
          createdAt,
          completedAt: null,
        };
  const tasks: readonly ReplenishmentTask[] = task === null ? state.tasks : [task, ...state.tasks];

  // 6. recalculate the recommended station for each dietary filter
  const recommendations = computeRecommendations(stations);

  return {
    patch: { updates, stations, alerts, tasks, recommendations, revision: state.revision + 1 },
    write: { kind: 'report', update, station: station ?? null, alert, task },
  };
}

export const useBonaFlowStore = create<BonaFlowState>((set, get) => ({
  event: EVENT,
  stations: SEEDED_STATIONS,
  updates: [],
  alerts: [],
  tasks: [],
  recommendations: computeRecommendations(SEEDED_STATIONS),
  revision: 0,
  lastSyncedAt: null,
  mode: null,
  dietFilter: 'all',
  selectedStationId: SEEDED_STATIONS[0].id,
  draft: null,
  draftInterpretation: null,
  setMode: (mode) => set({ mode }),
  setDietFilter: (dietFilter) => set({ dietFilter }),
  selectStation: (selectedStationId) => set({ selectedStationId }),
  hydrate: (snapshot) =>
    set((state) => ({
      event: snapshot.event,
      stations: snapshot.stations,
      updates: snapshot.updates,
      alerts: snapshot.alerts,
      tasks: snapshot.tasks,
      recommendations: computeRecommendations(snapshot.stations),
      revision: state.revision + 1,
      lastSyncedAt: eventNowIso(),
      // Local-only choices (mode, filter, draft) survive a hydrate untouched.
      selectedStationId: snapshot.stations.some((entry) => entry.id === state.selectedStationId)
        ? state.selectedStationId
        : (snapshot.stations[0]?.id ?? state.selectedStationId),
    })),
  startDraft: (draft, interpretation = null) => set({ draft, draftInterpretation: interpretation }),
  patchDraft: (patch) =>
    set((state) => (state.draft === null ? state : { draft: { ...state.draft, ...patch } })),
  clearDraft: () => set({ draft: null, draftInterpretation: null }),
  commitDraft: () => {
    const { draft, draftInterpretation } = get();
    if (draft === null) return;
    const { patch, write } = applyDraft(get(), draft, draftInterpretation);
    set({ ...patch, draft: null, draftInterpretation: null });
    emitWrite(write);
  },
  // Quick actions and the manual override are not read by anything, so they
  // carry no interpretation: there is nothing that was concluded rather than said.
  applyReport: (draft) => {
    const { patch, write } = applyDraft(get(), draft, null);
    set(patch);
    emitWrite(write);
  },
  completeTask: (taskId) => {
    const completedAt = eventNowIso();
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, status: 'done', completedAt } : task,
      ),
      revision: state.revision + 1,
    }));
    emitWrite({ kind: 'task_completed', taskId, completedAt });
  },
  setIncentiveActive: (active) => {
    const { event } = get();
    if (event.incentive === null) return;
    const incentive: Incentive = { ...event.incentive, active };
    set({ event: { ...event, incentive }, revision: get().revision + 1 });
    emitWrite({ kind: 'incentive', incentive });
  },
}));

export function findStation(
  stations: readonly Station[],
  stationId: string | null,
): Station | undefined {
  if (stationId === null) return undefined;
  return stations.find((station) => station.id === stationId);
}

export function findDish(station: Station | undefined, dishId: string | null): Dish | undefined {
  if (station === undefined || dishId === null) return undefined;
  return station.dishes.find((dish) => dish.id === dishId);
}
