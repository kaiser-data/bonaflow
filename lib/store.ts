import { create } from 'zustand';

/**
 * Single in-memory store for BonaFlow.
 *
 * Everything the UI reads lives here, so the seeded arrays can later be
 * replaced by an API response without touching any screen.
 */

export type AppMode = 'guest' | 'staff' | 'operations';

export type DietTag = 'vegan' | 'vegetarian' | 'gluten_free' | 'halal';

/** Active dietary filter. `all` means no filtering. */
export type DietFilter = 'all' | DietTag;

export type DishAvailability = 'available' | 'low' | 'sold_out' | 'uncertain';

/** Station status. Maps 1:1 to the reserved traffic-light colours. */
export type StationStatus = 'available' | 'busy' | 'closed' | 'no_update';

export type QueueLevel = 'low' | 'medium' | 'high' | 'unknown';

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

export type Announcement = {
  id: string;
  body: string;
  /** ISO local timestamp. */
  createdAt: string;
};

export type EventInfo = {
  name: string;
  venue: string;
  guests: number;
  serviceStart: string;
  serviceEnd: string;
};

const EVENT: EventInfo = {
  name: 'Future of Work Summit Berlin',
  venue: 'Delta Campus',
  guests: 250,
  serviceStart: '12:30',
  serviceEnd: '14:00',
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

type BonaFlowState = {
  event: EventInfo;
  stations: readonly Station[];
  /** Reverse-chronological announcements. Empty for now. */
  announcements: readonly Announcement[];
  mode: AppMode | null;
  dietFilter: DietFilter;
  setMode: (mode: AppMode | null) => void;
  setDietFilter: (filter: DietFilter) => void;
};

export const useBonaFlowStore = create<BonaFlowState>((set) => ({
  event: EVENT,
  stations: SEEDED_STATIONS,
  announcements: [],
  mode: null,
  dietFilter: 'all',
  setMode: (mode) => set({ mode }),
  setDietFilter: (dietFilter) => set({ dietFilter }),
}));
