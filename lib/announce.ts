import { incentiveForStation, issueTypeFor, verifyRedirect } from '@/lib/stations';
import {
  findDish,
  findStation,
  useBonaFlowStore,
  type DietFilter,
  type Dish,
  type Incentive,
  type IssueType,
  type StaffUpdate,
  type Station,
  type StationAlert,
} from '@/lib/store';
import { prewarmAnnouncement } from '@/lib/voice';

/**
 * Guest announcements, in English and German.
 *
 * Both lines are written here, by code, from the station code, the dish's own
 * declared dietary tags and the redirection the app has already verified. A
 * model never writes what a guest hears: the reading service may suggest
 * wording, but that suggestion is only shown to operations as a record.
 *
 * The offer clause is appended only when operations has an incentive active for
 * the station guests are being sent to, and its wording comes from the incentive
 * itself — never from a model.
 *
 * Nothing here ever claims a dish is safe to eat. The diet word is the dish's
 * declared tag, and it means "declared", not "checked".
 */

/** Both lines stay short enough to be understood over a room. */
export const MAX_ANNOUNCEMENT_WORDS = 20;

export type GuestAnnouncement = {
  id: string;
  createdAt: string;
  en: string;
  de: string;
  /** The operations incentive was appended to both lines. */
  incentiveApplied: boolean;
  /** Where guests are sent, after the availability check in plain code. */
  target: { stationId: string; code: string; name: string; dishName: string } | null;
  /** 'model' = a suggestion was verified, 'rule' = code chose, 'none' = nowhere to send. */
  targetSource: 'model' | 'rule' | 'none';
};

type Situation = 'low' | 'sold_out' | 'closed' | 'queue' | 'restocked' | 'other';

const SITUATIONS: Record<IssueType, Situation> = {
  low_stock: 'low',
  sold_out: 'sold_out',
  queue: 'queue',
  closure: 'closed',
  resolved: 'restocked',
  other: 'other',
};

const PRIMARY_EN: Record<Situation, (code: string) => string> = {
  low: (code) => `Station ${code} is running low.`,
  sold_out: (code) => `Station ${code} has sold out.`,
  closed: (code) => `Station ${code} is closed for now.`,
  queue: (code) => `Station ${code} has a long queue.`,
  restocked: (code) => `Station ${code} has been restocked.`,
  other: (code) => `Station ${code} has an update.`,
};

const PRIMARY_DE: Record<Situation, (code: string) => string> = {
  low: (code) => `Station ${code} hat nur noch wenige Portionen.`,
  sold_out: (code) => `Station ${code} ist ausverkauft.`,
  closed: (code) => `Station ${code} ist vorübergehend geschlossen.`,
  queue: (code) => `An Station ${code} ist die Schlange lang.`,
  restocked: (code) => `Station ${code} ist wieder aufgefüllt.`,
  other: (code) => `Station ${code} hat eine Aktualisierung.`,
};

/** Declared dietary tag, in words. Never a claim about what is in the food. */
const DIET_OPTIONS_EN: Record<DietFilter, string> = {
  all: 'Other options',
  vegan: 'Vegan options',
  vegetarian: 'Vegetarian options',
  gluten_free: 'Gluten-free options',
  halal: 'Halal options',
};

const DIET_OPTIONS_DE: Record<DietFilter, string> = {
  all: 'Weitere Optionen',
  vegan: 'Vegane Optionen',
  vegetarian: 'Vegetarische Optionen',
  gluten_free: 'Glutenfreie Optionen',
  halal: 'Halal-Optionen',
};

const NO_TARGET_EN = 'Check the Stations list for other options.';
const NO_TARGET_DE = 'Weitere Optionen findet ihr in der Stationsliste.';

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * The longest line that still fits the word limit. Candidates are ordered
 * longest first, so the offer clause is what gets dropped on a long line, never
 * the part that says where to go.
 */
function chooseWithinLimit(candidates: readonly string[]): string {
  return (
    candidates.find((candidate) => wordCount(candidate) <= MAX_ANNOUNCEMENT_WORDS) ??
    candidates[candidates.length - 1]
  );
}

/** The offer, in each language. The wording follows what operations set. */
function incentiveClause(incentive: Incentive): { en: string; de: string } {
  if (/coffee|kaffee/i.test(incentive.text)) {
    return { en: 'with a free coffee if you go now', de: 'mit einem Gratis-Kaffee' };
  }
  return { en: `plus ${incentive.text.toLowerCase()}`, de: `dazu ${incentive.text}` };
}

function build(input: {
  id: string;
  createdAt: string;
  station: Station | undefined;
  dish: Dish | null;
  situation: Situation;
  stations: readonly Station[];
  incentive: Incentive | null;
  suggestedStationId: string | null;
}): GuestAnnouncement {
  const code = input.station?.code ?? '?';
  const primaryEn = PRIMARY_EN[input.situation](code);
  const primaryDe = PRIMARY_DE[input.situation](code);

  // A restocked station is good news on its own; nobody is redirected.
  const target =
    input.situation === 'restocked' || input.station === undefined
      ? null
      : verifyRedirect({
          stations: input.stations,
          awayFromStationId: input.station.id,
          dish: input.dish,
          suggestedStationId: input.suggestedStationId,
        });

  if (target === null) {
    return {
      id: input.id,
      createdAt: input.createdAt,
      en: chooseWithinLimit([`${primaryEn} ${NO_TARGET_EN}`, primaryEn]),
      de: chooseWithinLimit([`${primaryDe} ${NO_TARGET_DE}`, primaryDe]),
      incentiveApplied: false,
      target: null,
      targetSource: 'none',
    };
  }

  const redirectEn = `${DIET_OPTIONS_EN[target.filter]} are available at Station ${target.station.code}`;
  const redirectDe = `${DIET_OPTIONS_DE[target.filter]} gibt es an Station ${target.station.code}`;

  // The offer is only mentioned when operations has one running for the station
  // guests are actually being sent to, and while it is still valid.
  const incentive = incentiveForStation(input.incentive, target.station.id);
  const clause = incentive === null ? null : incentiveClause(incentive);

  const en =
    clause === null
      ? chooseWithinLimit([`${primaryEn} ${redirectEn}.`, primaryEn])
      : chooseWithinLimit([
          `${primaryEn} ${redirectEn}, ${clause.en}.`,
          `${primaryEn} ${redirectEn}.`,
          primaryEn,
        ]);

  const de =
    clause === null
      ? chooseWithinLimit([`${primaryDe} ${redirectDe}.`, primaryDe])
      : chooseWithinLimit([
          `${primaryDe} ${redirectDe}, ${clause.de}.`,
          `${primaryDe} ${redirectDe}.`,
          primaryDe,
        ]);

  return {
    id: input.id,
    createdAt: input.createdAt,
    en,
    de,
    incentiveApplied: clause !== null && en.includes(clause.en),
    target: {
      stationId: target.station.id,
      code: target.station.code,
      name: target.station.name,
      dishName: target.dish.name,
    },
    targetSource: target.source,
  };
}

/** What kind of situation an alert describes, without asking anything remote. */
function issueTypeForAlert(update: StaffUpdate | null): IssueType {
  if (update === null) return 'other';
  return update.interpretation?.issueType ?? issueTypeFor(update);
}

export function announcementForAlert(input: {
  alert: StationAlert;
  update: StaffUpdate | null;
  stations: readonly Station[];
  incentive: Incentive | null;
}): GuestAnnouncement {
  const station = findStation(input.stations, input.alert.stationId);
  const dish = findDish(station, input.alert.dishId) ?? null;
  const update = input.update;

  return build({
    id: input.alert.id,
    createdAt: input.alert.createdAt,
    station,
    dish,
    situation: SITUATIONS[issueTypeForAlert(update)],
    stations: input.stations,
    incentive: input.incentive,
    suggestedStationId: update?.interpretation?.suggestedStationId ?? null,
  });
}

/** Announcements for the guest feed, newest first. */
export function announcementsForAlerts(input: {
  alerts: readonly StationAlert[];
  updates: readonly StaffUpdate[];
  stations: readonly Station[];
  incentive: Incentive | null;
}): readonly GuestAnnouncement[] {
  return [...input.alerts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((alert) =>
      announcementForAlert({
        alert,
        update: input.updates.find((entry) => entry.id === alert.updateId) ?? null,
        stations: input.stations,
        incentive: input.incentive,
      }),
    );
}

/**
 * The line the room is most likely to hear first: the station currently short of
 * something, and where guests should go instead. Built from the same code as
 * every other announcement, so what is pre-generated is exactly what plays.
 */
export function stageAnnouncement(
  stations: readonly Station[],
  incentive: Incentive | null,
): GuestAnnouncement | null {
  for (const station of stations) {
    const dish = station.dishes.find(
      (entry) => entry.availability === 'low' || entry.availability === 'sold_out',
    );
    if (dish === undefined) continue;

    return build({
      id: `stage-${station.id}-${dish.id}`,
      createdAt: station.lastUpdatedAt,
      station,
      dish,
      situation: dish.availability === 'low' ? 'low' : 'sold_out',
      stations,
      incentive,
      suggestedStationId: null,
    });
  }

  return null;
}

/**
 * Generates the two stage clips when the app starts, so the announcement plays
 * from the device rather than from a network call. Silent on failure: the lines
 * are always on screen as text as well.
 */
export async function prewarmStageAnnouncements(): Promise<void> {
  const { stations, event } = useBonaFlowStore.getState();
  const announcement = stageAnnouncement(stations, event.incentive);
  if (announcement === null) return;

  await prewarmAnnouncement(announcement.en);
  await prewarmAnnouncement(announcement.de);
}
