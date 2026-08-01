import type {
  AudioAttachment,
  DishAvailability,
  Priority,
  QueueLevel,
  ReportAction,
  ReportSource,
  Station,
  UpdateDraft,
} from '@/lib/store';

/**
 * Staff reporting logic. Every rule in this file is plain deterministic code:
 * no model, no network, no service calls. It works with the device in airplane
 * mode.
 */

export type QuickActionId =
  | 'stock_low'
  | 'sold_out'
  | 'replenished'
  | 'queue_up'
  | 'queue_clear'
  | 'station_closed';

export type QuickAction = {
  id: QuickActionId;
  label: string;
  /** 'dish' actions ask which dish they apply to; 'station' ones apply at once. */
  scope: 'dish' | 'station';
  availability: DishAvailability | null;
  queue: QueueLevel | null;
  action: ReportAction;
  priority: Priority;
};

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: 'stock_low',
    label: 'Stock running low',
    scope: 'dish',
    availability: 'low',
    queue: null,
    action: 'restock_soon',
    priority: 'medium',
  },
  {
    id: 'sold_out',
    label: 'Item sold out',
    scope: 'dish',
    availability: 'sold_out',
    queue: null,
    action: 'replenish',
    priority: 'high',
  },
  {
    id: 'replenished',
    label: 'Replenishment arrived',
    scope: 'dish',
    availability: 'available',
    queue: null,
    action: 'none',
    priority: 'low',
  },
  {
    id: 'queue_up',
    label: 'Queue increasing',
    scope: 'station',
    availability: null,
    queue: 'high',
    action: 'add_staff',
    priority: 'medium',
  },
  {
    id: 'queue_clear',
    label: 'Queue cleared',
    scope: 'station',
    availability: null,
    queue: 'low',
    action: 'none',
    priority: 'low',
  },
  {
    id: 'station_closed',
    label: 'Station temporarily closed',
    scope: 'station',
    availability: null,
    queue: null,
    action: 'close_station',
    priority: 'high',
  },
];

const EMPTY_DRAFT = {
  dishId: null,
  availability: null,
  queue: null,
  guestsWaiting: null,
  action: 'none',
  priority: 'low',
  note: '',
  source: 'text',
  photoUri: null,
  audio: null,
} satisfies Omit<UpdateDraft, 'stationId'>;

export function buildQuickActionDraft(
  quickAction: QuickAction,
  stationId: string,
  dishId: string | null,
): UpdateDraft {
  return {
    ...EMPTY_DRAFT,
    stationId,
    dishId,
    availability: quickAction.availability,
    queue: quickAction.queue,
    action: quickAction.action,
    priority: quickAction.priority,
    note: quickAction.label,
    source: 'quick_action',
  };
}

/**
 * Scripted state change used by the hidden demo override: Vegan Thai Curry at
 * Green Kitchen sells out, the station turns red, an alert and a task appear.
 * The ids are the seeded ones, so it runs with no network at all.
 */
export function buildOverrideDraft(): UpdateDraft {
  return {
    ...EMPTY_DRAFT,
    stationId: 'station-b',
    dishId: 'dish-b1',
    availability: 'sold_out',
    queue: 'high',
    guestsWaiting: 20,
    action: 'replenish',
    priority: 'high',
    note: 'Vegan Thai Curry sold out.',
    source: 'manual_override',
  };
}

/** Exact text the report field is pre-filled with when a permission is denied. */
export const PERMISSION_FALLBACK_TEXT =
  'Vegan Thai Curry is almost finished, and approximately 20 guests are waiting.';

/** Checked in order, so "almost finished" is read as low, not sold out. */
const AVAILABILITY_RULES: readonly { pattern: RegExp; value: DishAvailability }[] = [
  {
    pattern:
      /almost (finished|gone|out|empty)|running low|nearly (out|finished|gone|empty)|low on|last (few|portions|tray)/,
    value: 'low',
  },
  {
    pattern: /sold out|all gone|finished|empty|nothing left|none left|out of|ran out/,
    value: 'sold_out',
  },
  {
    pattern: /restocked|refilled|topped up|replenish(ed|ment)|new tray|fresh tray|back on/,
    value: 'available',
  },
  { pattern: /not sure|unsure|uncertain|hard to say|might be/, value: 'uncertain' },
];

const GUEST_COUNT_PATTERNS: readonly RegExp[] = [
  /(\d+)\s*(?:guests?|people|persons?)/,
  /(?:approximately|about|around|roughly)\s*(\d+)/,
  /queue of\s*(\d+)/,
  /(\d+)\s*(?:are\s*)?waiting/,
];

const QUEUE_HIGH =
  /queue is (long|growing|increasing|building)|long queue|big queue|queue increasing|very busy/;
const QUEUE_LOW =
  /queue (is )?(cleared|clear|short|gone|down)|no queue|nobody waiting|no one waiting/;
const CLOSED = /closed|closing|shut down|shutting|pausing service|out of service/;
const REOPENED = /reopen|open again|back open|serving again/;

/** Best dish match, requiring at least half of its significant words. */
function matchDish(
  stations: readonly Station[],
  lowerText: string,
): { stationId: string; dishId: string } | null {
  let best: { stationId: string; dishId: string; score: number } | null = null;

  for (const station of stations) {
    for (const dish of station.dishes) {
      const words = dish.name
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word.length > 3);
      if (words.length === 0) continue;
      const hits = words.filter((word) => lowerText.includes(word)).length;
      const score = hits / words.length;
      if (score >= 0.5 && (best === null || score > best.score)) {
        best = { stationId: station.id, dishId: dish.id, score };
      }
    }
  }

  return best === null ? null : { stationId: best.stationId, dishId: best.dishId };
}

function readGuestCount(lowerText: string): number | null {
  for (const pattern of GUEST_COUNT_PATTERNS) {
    const match = pattern.exec(lowerText);
    if (match !== null) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value) && value >= 0) return value;
    }
  }
  return null;
}

function readQueue(lowerText: string, guestsWaiting: number | null): QueueLevel | null {
  if (QUEUE_HIGH.test(lowerText)) return 'high';
  if (QUEUE_LOW.test(lowerText)) return 'low';
  if (guestsWaiting === null) return null;
  if (guestsWaiting >= 15) return 'high';
  if (guestsWaiting >= 6) return 'medium';
  return 'low';
}

function resolveAction(input: {
  availability: DishAvailability | null;
  queue: QueueLevel | null;
  guestsWaiting: number | null;
  closed: boolean;
  reopened: boolean;
}): { action: ReportAction; priority: Priority } {
  if (input.closed) return { action: 'close_station', priority: 'high' };
  if (input.reopened) return { action: 'reopen_station', priority: 'medium' };
  if (input.availability === 'sold_out') return { action: 'replenish', priority: 'high' };
  if (input.availability === 'low') {
    const urgent = (input.guestsWaiting ?? 0) >= 10 || input.queue === 'high';
    return urgent
      ? { action: 'replenish', priority: 'high' }
      : { action: 'restock_soon', priority: 'medium' };
  }
  if (input.availability === 'uncertain') return { action: 'restock_soon', priority: 'medium' };
  if (input.availability === 'available') return { action: 'none', priority: 'low' };
  if (input.queue === 'high') return { action: 'add_staff', priority: 'medium' };
  return { action: 'none', priority: 'low' };
}

/**
 * Reads a free-text report into the fields the confirmation screen shows.
 * Keyword matching only — the staff member sees and edits every field before
 * anything is applied, so a miss costs one tap, not a wrong update.
 */
export function interpretReport(input: {
  text: string;
  stations: readonly Station[];
  stationId: string;
  source: ReportSource;
  photoUri?: string | null;
  audio?: AudioAttachment | null;
}): UpdateDraft {
  const lowerText = input.text.toLowerCase();
  const dishMatch = matchDish(input.stations, lowerText);

  const availability =
    AVAILABILITY_RULES.find((rule) => rule.pattern.test(lowerText))?.value ?? null;
  const guestsWaiting = readGuestCount(lowerText);
  const queue = readQueue(lowerText, guestsWaiting);
  const closed = CLOSED.test(lowerText);
  const reopened = REOPENED.test(lowerText);
  const { action, priority } = resolveAction({
    availability,
    queue,
    guestsWaiting,
    closed,
    reopened,
  });

  return {
    stationId: dishMatch?.stationId ?? input.stationId,
    // Availability can only be applied to a dish, so it is dropped when the
    // report does not name one.
    dishId: dishMatch?.dishId ?? null,
    availability: dishMatch === null ? null : availability,
    queue,
    guestsWaiting,
    action,
    priority,
    note: input.text.trim(),
    source: input.source,
    photoUri: input.photoUri ?? null,
    audio: input.audio ?? null,
  };
}

/** Draft for a voice note. Nothing is transcribed: no model, no network. */
export function buildVoiceDraft(input: {
  stationId: string;
  dishId: string | null;
  audio: AudioAttachment;
}): UpdateDraft {
  return {
    ...EMPTY_DRAFT,
    stationId: input.stationId,
    dishId: input.dishId,
    note: 'Voice note attached. Fill in what it says before confirming.',
    source: 'voice',
    audio: input.audio,
  };
}
