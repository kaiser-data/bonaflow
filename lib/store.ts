import { create } from 'zustand';

import { eventNowIso } from '@/lib/clock';
import { deviceId } from '@/lib/device';
import { balanceFor, findReward, pointsFor, redemptionCode } from '@/lib/rewards';
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

/**
 * Dietary tag as printed on the bowl label. Only a declared tag is ever used for
 * filtering: the app never decides what a dish contains. A tag that was worked
 * out from a photo rather than read off the label is deliberately absent here and
 * explained in the dish's `note` instead.
 */
export type DietTag = 'vegan' | 'vegetarian' | 'high_protein';

/** The 14 allergens an EU label declares. Bowl labels are printed in English. */
export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'egg'
  | 'fish'
  | 'peanut'
  | 'soy'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphite'
  | 'lupin'
  | 'mollusc';

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
  /** Declared on the label. The only thing dietary filtering uses. */
  tags: readonly DietTag[];
  availability: DishAvailability;
  /**
   * Allergens exactly as printed on the bowl label. `null` means the label could
   * not be read — shown as "not recorded", never guessed and never inferred from
   * the dish name.
   */
  allergens: readonly Allergen[] | null;
  /** Seen in the open bowl. Descriptive only, never a declaration. */
  ingredients: readonly string[];
  /** Photo filename in the event asset set. Empty when there is no photo. */
  image: string;
  /** Photo of the printed label, when it was legible. */
  labelImage: string | null;
  /** Plain-language caveat shown under the dish, e.g. an undeclared tag. */
  note: string | null;
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

/* ---------------------------------------------------------------------------
 * Guest feedback on a meal, and what the guest earns for giving it.
 *
 * This is the other direction of the same conversation: staff report what is
 * running out, guests report what went in the bin and why. The reasons are a
 * closed list so the answers can be counted, and the guest's own words are kept
 * verbatim alongside them so the kitchen can read what a count cannot say.
 * ------------------------------------------------------------------------- */

/** How much of the bowl was left. */
export type LeftoverAmount = 'none' | 'a_little' | 'about_half' | 'most_of_it';

/**
 * Why food was left, or why the meal disappointed. Closed list: a reason has to
 * be countable to be worth anything to a kitchen, and free text alone cannot be
 * counted. `other` exists so nobody is forced into a wrong box.
 */
export type LeftoverReason =
  | 'portion_too_large'
  | 'not_tasty'
  | 'too_spicy'
  | 'too_salty'
  | 'bland'
  | 'cold'
  | 'texture'
  | 'not_fresh'
  | 'disliked_ingredient'
  | 'no_time'
  | 'wanted_something_else'
  | 'other';

export type RatingSource = 'voice' | 'text' | 'taps';

export type RatingLanguage = 'en' | 'de' | 'other';

export type RatingSentiment = 'positive' | 'mixed' | 'negative' | 'unclear';

/** Only what the guest actually said. Never merged with what was concluded. */
export type ReportedRating = {
  /** 1 to 5, and only when a human said a number. */
  score: number | null;
  leftover: LeftoverAmount | null;
  reasons: readonly LeftoverReason[];
};

/**
 * How one spoken or typed review was read, kept with the rating so operations can
 * still tell heard from concluded long afterwards.
 */
export type RatingInterpretation = {
  /** 'model' means the reading service answered; 'keyword' is the offline reader. */
  mode: 'model' | 'keyword';
  summary: string;
  confidence: number;
  /** What the guest said. */
  reported: ReportedRating;
  /** Reasons the service suggested but the guest never said. Shown as suggestions. */
  suggestedReasons: readonly LeftoverReason[];
  inferences: readonly FieldInference[];
  sentiment: RatingSentiment;
  /** One line for the kitchen. Never spoken to guests, never an offer. */
  kitchenNote: string;
  corrections: readonly string[];
  /** Why the offline reader ran. Null in model mode. */
  reason: string | null;
};

/** A review in progress. Nothing is stored until the guest confirms it. */
export type RatingDraft = {
  stationId: string;
  dishId: string;
  score: number | null;
  leftover: LeftoverAmount | null;
  reasons: readonly LeftoverReason[];
  /** The guest's own words, in the language they used. Never rewritten. */
  comment: string;
  language: RatingLanguage;
  source: RatingSource;
  audio: AudioAttachment | null;
};

export type MealRating = RatingDraft & {
  id: string;
  /** Anonymous device, never a person. */
  deviceId: string;
  interpretation: RatingInterpretation | null;
  /** Decided by the backend; the same rule is applied locally so the UI matches. */
  pointsAwarded: number;
  createdAt: string;
};

/** How the transcript kept with a recording was produced. */
export type TranscriptSource = 'voice_service' | 'typed' | 'none';

/** Which side of the service a recording came from. */
export type RecordingKind = 'guest_rating' | 'staff_update';

/**
 * A voice note as the archive holds it.
 *
 * The recording itself is uploaded once and lives in the backend, not on the
 * phone that made it, so the day can be listened to and analysed afterwards.
 * `storagePath` is null while the upload is still in flight, and stays null with
 * a reason in `uploadError` when the audio could not be stored — in that case the
 * transcript is still kept, because the sentence is the part the kitchen needs.
 */
export type VoiceRecording = {
  id: string;
  kind: RecordingKind;
  /** The rating or staff update this note belongs to. */
  refId: string;
  /** Anonymous device, never a person. Empty for staff notes. */
  deviceId: string;
  stationId: string;
  dishId: string | null;
  /** Path inside the backend audio bucket, or null when nothing was stored. */
  storagePath: string | null;
  mimeType: string;
  extension: string;
  durationMs: number;
  bytes: number | null;
  /** The words that were stored with it, in the language they were said in. */
  transcript: string;
  transcriptSource: TranscriptSource;
  language: RatingLanguage;
  /** Plain-language reason the audio was not stored. Null when it was. */
  uploadError: string | null;
  createdAt: string;
};

/** A reward a guest has taken, shown at the counter as proof. */
export type Redemption = {
  id: string;
  deviceId: string;
  rewardId: string;
  rewardLabel: string;
  cost: number;
  /** Short code the counter can read off the screen. */
  code: string;
  stationId: string | null;
  createdAt: string;
};

const EVENT: EventInfo = {
  name: '8x Bella & Bona Mobile Hack',
  venue: 'Delta Campus, Berlin',
  guests: 250,
  serviceStart: '12:30',
  serviceEnd: '14:00',
  incentive: {
    active: true,
    text: 'Free coffee at Counter C',
    appliesToStationId: 'station-c',
    authorizedBy: 'event_organiser',
    expiresAt: '2026-08-01T13:15:00',
  },
};

/**
 * Today's real menu, as photographed and transcribed at Delta Campus on
 * 1 August 2026 around 12:50. Dish ids and names come from the printed bowl
 * labels; the allergen lists are what those labels say, and nothing more.
 *
 * `tags` holds only what a label declares. Mediterranean Cruise looks vegetarian
 * in the bowl, but that word is not printed on its label, so it carries no tag
 * and says why. The Thai peanut bowl's allergen list was not legible, so it is
 * `null` — recorded as missing rather than filled in from the dish name.
 *
 * The three counters are the serving points guests walk up to. They are what the
 * app shows before the first successful fetch, and what it keeps showing when the
 * network is unavailable.
 */
const SEEDED_STATIONS: readonly Station[] = [
  {
    id: 'station-a',
    code: 'A',
    name: 'Counter A',
    location: 'Delta Campus lunch area',
    queue: 'medium',
    status: 'available',
    lastUpdatedAt: '2026-08-01T12:41:00',
    dishes: [
      {
        id: 'chicken-pasta-salad',
        name: 'Chicken Pasta Salad',
        tags: [],
        availability: 'available',
        allergens: ['gluten', 'milk', 'mustard', 'sulphite'],
        ingredients: [
          'penne pasta',
          'chicken',
          'mozzarella pearls',
          'kalamata olives',
          'sun-dried tomato',
          'roasted red pepper',
          'herb dressing',
        ],
        image: 'chicken-pasta-salad.jpg',
        labelImage: 'chicken-pasta-salad-label.jpg',
        note: null,
      },
      {
        id: 'high-protein-chicken-rice',
        name: 'High Protein Chicken and Rice',
        tags: ['high_protein'],
        availability: 'available',
        allergens: ['celery'],
        ingredients: [
          'grilled chicken',
          'rice',
          'cucumber',
          'cherry tomato',
          'pickled red cabbage',
          'tomato sauce',
        ],
        image: 'high-protein-chicken-rice.jpg',
        labelImage: 'high-protein-chicken-rice-label.jpg',
        note: null,
      },
    ],
  },
  {
    id: 'station-b',
    code: 'B',
    name: 'Counter B',
    location: 'Delta Campus lunch area',
    queue: 'high',
    status: 'busy',
    lastUpdatedAt: '2026-08-01T12:52:00',
    dishes: [
      {
        id: 'thai-peanut-tofu-bowl',
        name: 'High Protein Thai Peanut Bowl with Chickpea & Tofu',
        tags: ['vegan', 'high_protein'],
        availability: 'low',
        // Not legible on the label. Left missing on purpose: the word "peanut"
        // in the name is not evidence of the rest of the list.
        allergens: null,
        ingredients: [
          'tofu',
          'chickpeas',
          'sweetcorn',
          'carrot',
          'cucumber',
          'pickled red cabbage',
          'peanut sauce',
          'sesame seeds',
        ],
        image: 'thai-peanut-tofu-bowl.jpg',
        labelImage: null,
        note: 'The allergen list on this bowl was not legible, so it is not recorded here.',
      },
      {
        id: 'mediterranean-cruise',
        name: 'Mediterranean Cruise',
        tags: [],
        availability: 'available',
        allergens: ['milk', 'gluten', 'sulphite'],
        ingredients: [
          'rocket',
          'feta',
          'sun-dried tomato',
          'roasted red pepper',
          'balsamic dressing',
        ],
        image: 'mediterranean-cruise.jpg',
        labelImage: 'mediterranean-cruise-label.jpg',
        note: 'Vegetarian is not printed on this label, so it is not offered as a dietary filter.',
      },
    ],
  },
  {
    id: 'station-c',
    code: 'C',
    name: 'Counter C',
    location: 'Delta Campus lunch area',
    queue: 'low',
    status: 'available',
    lastUpdatedAt: '2026-08-01T12:47:00',
    dishes: [
      {
        id: 'vegan-chickpeas-quinoa-salad',
        name: 'Vegan Chickpeas Quinoa Salad',
        tags: ['vegan'],
        availability: 'available',
        allergens: ['mustard'],
        ingredients: [
          'chickpeas',
          'quinoa',
          'avocado',
          'cherry tomato',
          'roasted red pepper',
          'pumpkin seeds',
          'herb dressing',
        ],
        image: 'vegan-chickpeas-quinoa-salad.jpg',
        labelImage: 'vegan-chickpeas-quinoa-salad-label.jpg',
        note: null,
      },
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
  /** Every guest rating, newest first. Shared: operations reads the same rows. */
  ratings: readonly MealRating[];
  redemptions: readonly Redemption[];
  /** Every voice note that has been filed, newest first. */
  recordings: readonly VoiceRecording[];
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

/**
 * A voice note on its way to the archive. The local file uri travels with it
 * because the audio still has to be read off this device and uploaded; the row
 * itself never carries a device path, since it would mean nothing tomorrow.
 */
export type RecordingWrite = {
  kind: 'recording';
  recording: VoiceRecording;
  audio: AudioAttachment;
};

/** Every change the backend needs to hear about. */
export type PendingWrite =
  | ReportWrite
  | RecordingWrite
  | { kind: 'task_completed'; taskId: string; completedAt: string }
  | { kind: 'incentive'; incentive: Incentive | null }
  | { kind: 'rating'; rating: MealRating }
  | { kind: 'redemption'; redemption: Redemption };

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
  /** Every guest rating, newest first. */
  ratings: readonly MealRating[];
  /** Rewards guests have taken, newest first. */
  redemptions: readonly Redemption[];
  /** Voice notes filed in the archive, newest first. Downloadable from operations. */
  recordings: readonly VoiceRecording[];
  /**
   * The bowl a guest tapped somewhere else in the app, so the Rate tab opens on
   * it instead of asking again. Cleared as soon as the Rate tab has read it.
   */
  ratingTarget: { stationId: string; dishId: string } | null;
  /** Pending guest review. Nothing is stored while this is set. */
  ratingDraft: RatingDraft | null;
  /** How the pending review was read. */
  ratingInterpretation: RatingInterpretation | null;
  /** The rating just confirmed, so the screen can show what it earned. */
  lastRating: MealRating | null;
  /** The reward just taken, so the screen can show the code to the counter. */
  lastRedemption: Redemption | null;
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
  /** Remember which bowl a guest tapped, so the Rate tab opens on it. */
  setRatingTarget: (stationId: string, dishId: string) => void;
  clearRatingTarget: () => void;
  /** Open the review confirmation flow with a read review. */
  startRatingDraft: (draft: RatingDraft, interpretation?: RatingInterpretation | null) => void;
  patchRatingDraft: (patch: Partial<RatingDraft>) => void;
  clearRatingDraft: () => void;
  /** Store the pending review, award its points, then clear the draft. */
  commitRatingDraft: () => void;
  /** Take a reward, if this device has earned enough for it. */
  redeemReward: (rewardId: string) => void;
  clearLastRedemption: () => void;
};

/**
 * Describes a voice note for the archive.
 *
 * Whether the words were spoken or typed is recorded rather than guessed: a note
 * whose transcription failed and was typed in by hand must not later read as
 * something a service heard.
 */
function buildRecording(input: {
  kind: RecordingKind;
  refId: string;
  deviceId: string;
  stationId: string;
  dishId: string | null;
  transcript: string;
  /** True when the transcript came from the voice service rather than a keyboard. */
  spoken: boolean;
  language: RatingLanguage;
  audio: AudioAttachment;
  createdAt: string;
}): VoiceRecording {
  const transcript = input.transcript.trim();

  return {
    id: makeId('recording'),
    kind: input.kind,
    refId: input.refId,
    deviceId: input.deviceId,
    stationId: input.stationId,
    dishId: input.dishId,
    // Filled in by the backend once the audio is stored.
    storagePath: null,
    mimeType: input.audio.mimeType,
    extension: input.audio.extension,
    durationMs: input.audio.durationMs,
    bytes: null,
    transcript,
    transcriptSource: transcript.length === 0 ? 'none' : input.spoken ? 'voice_service' : 'typed',
    language: input.language,
    uploadError: null,
    createdAt: input.createdAt,
  };
}

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
): { patch: Partial<BonaFlowState>; write: ReportWrite; recording: RecordingWrite | null } {
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

  // A spoken report also goes to the archive, so the note can be listened to
  // later next to the fields it produced.
  const recording =
    draft.audio === null
      ? null
      : buildRecording({
          kind: 'staff_update',
          refId: update.id,
          deviceId: '',
          stationId: draft.stationId,
          dishId: draft.dishId,
          transcript: draft.note,
          spoken: draft.source === 'voice',
          language: 'other',
          audio: draft.audio,
          createdAt,
        });

  return {
    patch: {
      updates,
      stations,
      alerts,
      tasks,
      recommendations,
      revision: state.revision + 1,
      recordings: recording === null ? state.recordings : [recording, ...state.recordings],
    },
    write: { kind: 'report', update, station: station ?? null, alert, task },
    recording:
      recording === null || draft.audio === null
        ? null
        : { kind: 'recording', recording, audio: draft.audio },
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
  ratings: [],
  redemptions: [],
  recordings: [],
  ratingTarget: null,
  ratingDraft: null,
  ratingInterpretation: null,
  lastRating: null,
  lastRedemption: null,
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
      ratings: snapshot.ratings,
      redemptions: snapshot.redemptions,
      recordings: snapshot.recordings,
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
    const { patch, write, recording } = applyDraft(get(), draft, draftInterpretation);
    set({ ...patch, draft: null, draftInterpretation: null });
    emitWrite(write);
    // The report is filed first; the note follows it, so a slow upload can never
    // hold up what the stations and guests need to see.
    if (recording !== null) emitWrite(recording);
  },
  // Quick actions and the manual override are not read by anything, so they
  // carry no interpretation: there is nothing that was concluded rather than said.
  applyReport: (draft) => {
    const { patch, write, recording } = applyDraft(get(), draft, null);
    set(patch);
    emitWrite(write);
    if (recording !== null) emitWrite(recording);
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
  setRatingTarget: (stationId, dishId) => set({ ratingTarget: { stationId, dishId } }),
  clearRatingTarget: () => set({ ratingTarget: null }),
  startRatingDraft: (ratingDraft, ratingInterpretation = null) =>
    set({ ratingDraft, ratingInterpretation, lastRating: null }),
  patchRatingDraft: (patch) =>
    set((state) =>
      state.ratingDraft === null ? state : { ratingDraft: { ...state.ratingDraft, ...patch } },
    ),
  clearRatingDraft: () => set({ ratingDraft: null, ratingInterpretation: null }),
  /**
   * The guest has checked every field. The review is stored with the points it
   * earned — the same rule the backend applies, so the total shown on the phone
   * is the total the backend will hold — and the draft is cleared.
   */
  commitRatingDraft: () => {
    const state = get();
    const { ratingDraft, ratingInterpretation } = state;
    if (ratingDraft === null) return;

    const id = deviceId();
    const createdAt = eventNowIso();
    const rating: MealRating = {
      ...ratingDraft,
      id: makeId('rating'),
      deviceId: id,
      interpretation: ratingInterpretation,
      pointsAwarded: pointsFor({
        deviceId: id,
        dishId: ratingDraft.dishId,
        source: ratingDraft.source,
        reasons: ratingDraft.reasons,
        ratings: state.ratings,
      }),
      createdAt,
    };

    // A spoken review is kept as audio as well as words, so the kitchen can hear
    // the tone and the day can be analysed properly afterwards.
    const recording =
      ratingDraft.audio === null
        ? null
        : buildRecording({
            kind: 'guest_rating',
            refId: rating.id,
            deviceId: id,
            stationId: rating.stationId,
            dishId: rating.dishId,
            transcript: rating.comment,
            spoken: rating.source === 'voice',
            language: rating.language,
            audio: ratingDraft.audio,
            createdAt,
          });

    set({
      ratings: [rating, ...state.ratings],
      ratingDraft: null,
      ratingInterpretation: null,
      lastRating: rating,
      revision: state.revision + 1,
      recordings: recording === null ? state.recordings : [recording, ...state.recordings],
    });
    emitWrite({ kind: 'rating', rating });
    if (recording !== null && ratingDraft.audio !== null) {
      emitWrite({ kind: 'recording', recording, audio: ratingDraft.audio });
    }
  },
  /**
   * Taking a reward. The balance is checked here so the button cannot spend
   * points the device does not have, and checked again by the backend, which is
   * the authority. Nothing is deducted anywhere: the balance is always earned
   * minus taken, computed from the rows themselves.
   */
  redeemReward: (rewardId) => {
    const state = get();
    const reward = findReward(rewardId);
    if (reward === undefined) return;

    const id = deviceId();
    if (balanceFor(state.ratings, state.redemptions, id) < reward.cost) return;

    const redemption: Redemption = {
      id: makeId('redemption'),
      deviceId: id,
      rewardId: reward.id,
      rewardLabel: reward.label,
      cost: reward.cost,
      code: redemptionCode(),
      stationId: reward.stationId,
      createdAt: eventNowIso(),
    };

    set({
      redemptions: [redemption, ...state.redemptions],
      lastRedemption: redemption,
      revision: state.revision + 1,
    });
    emitWrite({ kind: 'redemption', redemption });
  },
  clearLastRedemption: () => set({ lastRedemption: null }),
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
