import type {
  Announcement,
  DietFilter,
  DietTag,
  Dish,
  DishAvailability,
  QueueLevel,
  Station,
  StationStatus,
} from '@/lib/store';
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

/** low < medium < high < unknown */
const QUEUE_RANK: Record<QueueLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  unknown: 3,
};

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
