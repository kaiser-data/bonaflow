import type {
  Announcement,
  DietFilter,
  DietTag,
  Dish,
  DishAvailability,
  Incentive,
  Priority,
  QueueLevel,
  RecommendationRef,
  ReportAction,
  Station,
  StationStatus,
} from '@/lib/store';
import { isStillValid } from '@/lib/clock';
import { statusColors, type StatusColor } from '@/lib/theme';

/**
 * Pure, dependency-free view logic for stations.
 *
 * The recommendation is plain deterministic code — no model, no scoring
 * heuristics beyond the documented queue ordering.
 */

export const DIET_FILTERS: readonly { value: DietFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'gluten_free', label: 'Gluten-free' },
  { value: 'halal', label: 'Halal' },
];

const DIET_TAG_LABELS: Record<DietTag, string> = {
  vegan: 'vegan',
  vegetarian: 'vegetarian',
  gluten_free: 'gluten-free',
  halal: 'halal',
};

const STATUS_LABELS: Record<StationStatus, string> = {
  available: 'available',
  busy: 'busy',
  closed: 'closed',
  no_update: 'no update',
};

const STATUS_COLOR_KEYS: Record<StationStatus, StatusColor> = {
  available: 'green',
  busy: 'orange',
  closed: 'red',
  no_update: 'grey',
};

const STATUS_DESCRIPTIONS: Record<StationStatus, string> = {
  available: 'Available',
  busy: 'Running low or busy',
  closed: 'Sold out or closed',
  no_update: 'No recent update',
};

const AVAILABILITY_LABELS: Record<DishAvailability, string> = {
  available: 'available',
  low: 'low',
  sold_out: 'sold out',
  uncertain: 'uncertain',
};

const QUEUE_LABELS: Record<QueueLevel, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  unknown: 'unknown',
};

const QUEUE_DESCRIPTORS: Record<QueueLevel, string> = {
  low: 'short queue',
  medium: 'medium queue',
  high: 'long queue',
  unknown: 'queue unknown',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
};

const ACTION_LABELS: Record<ReportAction, string> = {
  replenish: 'replenish',
  restock_soon: 'restock soon',
  add_staff: 'add staff',
  close_station: 'close station',
  reopen_station: 'reopen station',
  none: 'no action needed',
};

/** low < medium < high < unknown */
const QUEUE_RANK: Record<QueueLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  unknown: 3,
};

/** Option lists used by the editable confirmation screen. */
export const AVAILABILITY_OPTIONS: readonly DishAvailability[] = [
  'available',
  'low',
  'sold_out',
  'uncertain',
];
export const QUEUE_OPTIONS: readonly QueueLevel[] = ['low', 'medium', 'high', 'unknown'];
export const PRIORITY_OPTIONS: readonly Priority[] = ['low', 'medium', 'high'];
export const ACTION_OPTIONS: readonly ReportAction[] = [
  'replenish',
  'restock_soon',
  'add_staff',
  'close_station',
  'reopen_station',
  'none',
];

/** Word used in the "no station" sentence, e.g. "vegan". */
export function dietPhrase(filter: DietFilter): string {
  return filter === 'all' ? 'matching' : DIET_TAG_LABELS[filter];
}

/** Capitalised diet word used in the recommendation reason line. */
export function dietReasonLabel(filter: DietFilter): string {
  if (filter === 'all') return 'Any diet';
  const phrase = DIET_TAG_LABELS[filter];
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function dietTagLabel(tag: DietTag): string {
  return DIET_TAG_LABELS[tag];
}

export function statusLabel(status: StationStatus): string {
  return STATUS_LABELS[status];
}

export function statusDescription(status: StationStatus): string {
  return STATUS_DESCRIPTIONS[status];
}

export function statusColor(status: StationStatus): string {
  return statusColors[STATUS_COLOR_KEYS[status]];
}

export function availabilityLabel(availability: DishAvailability): string {
  return AVAILABILITY_LABELS[availability];
}

export function queueLabel(queue: QueueLevel): string {
  return QUEUE_LABELS[queue];
}

export function queueDescriptor(queue: QueueLevel): string {
  return QUEUE_DESCRIPTORS[queue];
}

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

export function actionLabel(action: ReportAction): string {
  return ACTION_LABELS[action];
}

function dishMatchesFilter(dish: Dish, filter: DietFilter): boolean {
  return filter === 'all' || dish.tags.includes(filter);
}

/** Stations with at least one dish matching the filter. */
export function filterStations(
  stations: readonly Station[],
  filter: DietFilter,
): readonly Station[] {
  if (filter === 'all') return stations;
  return stations.filter((station) =>
    station.dishes.some((dish) => dishMatchesFilter(dish, filter)),
  );
}

export type Recommendation = {
  station: Station;
  dish: Dish;
  reason: string;
};

/**
 * Candidates are stations holding a matching dish that is currently
 * "available". They are ranked by queue level only; the first one wins, and
 * ties keep the seeded station order.
 */
export function recommendStation(
  stations: readonly Station[],
  filter: DietFilter,
): Recommendation | null {
  const candidates = stations
    .map((station) => ({
      station,
      dish: station.dishes.find(
        (dish) => dishMatchesFilter(dish, filter) && dish.availability === 'available',
      ),
    }))
    .filter((entry): entry is { station: Station; dish: Dish } => entry.dish !== undefined);

  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort(
    (a, b) => QUEUE_RANK[a.station.queue] - QUEUE_RANK[b.station.queue],
  );
  const top = ranked[0];

  return {
    station: top.station,
    dish: top.dish,
    reason: `${dietReasonLabel(filter)} · available · ${queueDescriptor(top.station.queue)}`,
  };
}

/**
 * Recommendation for every dietary filter at once. Recalculated whenever a
 * report is confirmed, so the guest view never has to work it out on demand.
 */
export function computeRecommendations(
  stations: readonly Station[],
): Record<DietFilter, RecommendationRef | null> {
  const recommendations: Record<DietFilter, RecommendationRef | null> = {
    all: null,
    vegan: null,
    vegetarian: null,
    gluten_free: null,
    halal: null,
  };

  for (const { value } of DIET_FILTERS) {
    const result = recommendStation(stations, value);
    recommendations[value] =
      result === null
        ? null
        : { stationId: result.station.id, dishId: result.dish.id, reason: result.reason };
  }

  return recommendations;
}

/**
 * Station status derived from the dishes on the counter, the queue and the
 * reported action. Red means sold out or closed, so a sold-out dish turns the
 * station red; orange covers running low or busy.
 */
export function deriveStationStatus(input: {
  dishes: readonly Dish[];
  queue: QueueLevel;
  action: ReportAction;
}): StationStatus {
  if (input.action === 'close_station') return 'closed';
  if (input.dishes.some((dish) => dish.availability === 'sold_out')) return 'closed';
  if (input.dishes.some((dish) => dish.availability === 'low') || input.queue === 'high') {
    return 'busy';
  }
  if (input.queue === 'unknown') return 'no_update';
  return 'available';
}

/** Plain-language alert text for a report. No model involved. */
export function describeUpdate(
  report: {
    availability: DishAvailability | null;
    queue: QueueLevel | null;
    guestsWaiting: number | null;
    action: ReportAction;
    priority: Priority;
    note: string;
  },
  stationName: string,
  dishName: string | null,
): { alertMessage: string; recommendedAction: string } {
  const subject = dishName === null ? stationName : `${dishName} at ${stationName}`;

  const parts: string[] = [];
  if (report.availability !== null) {
    parts.push(`${subject} is ${availabilityLabel(report.availability)}`);
  } else if (report.action === 'close_station') {
    parts.push(`${stationName} is temporarily closed`);
  } else if (report.queue !== null) {
    parts.push(`${stationName} queue is ${queueLabel(report.queue)}`);
  } else {
    parts.push(`${stationName} reported an update`);
  }

  if (report.guestsWaiting !== null) {
    parts.push(`approximately ${report.guestsWaiting} guests waiting`);
  }

  const recommendedAction =
    report.action === 'none'
      ? 'No action needed'
      : `${actionLabel(report.action)} — priority ${priorityLabel(report.priority)}`;

  return { alertMessage: `${parts.join(', ')}.`, recommendedAction };
}

/** Newest first. */
export function sortAnnouncements(announcements: readonly Announcement[]): readonly Announcement[] {
  return [...announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 24h clock, e.g. "12:41". Kept mono-friendly and locale independent. */
export function formatClock(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const AUTHORIZED_BY_LABELS: Record<string, string> = {
  event_organiser: 'the event organiser',
  operations: 'operations',
  catering_lead: 'the catering lead',
};

/** "Offered by the event organiser · until 13:15" */
export function incentiveAttribution(incentive: Incentive): string {
  const who = AUTHORIZED_BY_LABELS[incentive.authorizedBy] ?? incentive.authorizedBy;
  return `Offered by ${who} · until ${formatClock(incentive.expiresAt)}`;
}

/** The incentive to show on a station card, or null. Set by operations only. */
export function incentiveForStation(
  incentive: Incentive | null,
  stationId: string,
): Incentive | null {
  if (incentive === null || !incentive.active) return null;
  if (incentive.appliesToStationId !== stationId) return null;
  if (!isStillValid(incentive.expiresAt)) return null;
  return incentive;
}
