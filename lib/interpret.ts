import { backendConfigured, bilt } from '@/lib/backend';
import { interpretReport } from '@/lib/reports';
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
 * Reads a staff sentence into draft fields.
 *
 * The reading happens in the `interpret-report` Bilt Cloud function, which is the
 * only place the model endpoint, the API key and the model name exist — none of
 * the three is in this app, and the call is never made from a device. The
 * function is sent the sentence plus the closed lists of stations and dishes it
 * may choose from, and answers with fields that have already been validated
 * against those lists.
 *
 * TEXT ONLY. The tray photo is never sent. It stays attached to the alert and the
 * activity feed as evidence for a human, so `observed` is always null and a
 * report with no photo is read exactly the same way as one with a photo.
 *
 * The deterministic keyword interpreter in lib/reports.ts is the automatic
 * fallback. If the call fails, times out, or the answer fails validation, the
 * keyword extraction runs instead and the confirmation screen is labelled
 * `OFFLINE_INTERPRETATION_LABEL`. The staff member confirms every field either
 * way, so the demo never blocks on a network call.
 */

/**
 * Only a guard against a function that never answers. The model call itself is
 * abandoned server-side at 8 seconds, which is the timeout that matters.
 */
const CALL_TIMEOUT_MS = 10000;

/** Shown on the confirmation screen whenever the keyword fallback was used. */
export const OFFLINE_INTERPRETATION_LABEL = 'offline interpretation — please check the fields';

const UNREACHABLE = 'The reading service could not be reached.';

const AVAILABILITIES: readonly DishAvailability[] = ['available', 'low', 'sold_out', 'uncertain'];
const QUEUES: readonly QueueLevel[] = ['low', 'medium', 'high', 'unknown'];
const ACTIONS: readonly ReportAction[] = [
  'replenish',
  'restock_soon',
  'add_staff',
  'close_station',
  'reopen_station',
  'none',
];
const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];

/** A field the model concluded rather than heard. Always carries a confidence. */
export type FieldInference = {
  field: string;
  value: string;
  /** 0 to 1. */
  confidence: number;
  /** The words it came from, in one short phrase. */
  basis: string;
};

/** Only what the staff member actually said. Kept apart from the inferences. */
export type ReportedFacts = {
  availability: DishAvailability | null;
  queue: QueueLevel | null;
  stationClosed: boolean;
  stationReopened: boolean;
};

export type DraftInterpretation = {
  /** 'model' means the reading service answered; 'keyword' is the fallback. */
  mode: 'model' | 'keyword';
  /** One-line summary from the model. Empty in keyword mode. */
  summary: string;
  /** What was heard. Null in keyword mode, which does not separate the two. */
  facts: ReportedFacts | null;
  /** What was concluded, each with a confidence. */
  inferences: readonly FieldInference[];
  /** Photo analysis. Always null: the photo is never sent to the model. */
  observed: string | null;
  /** Fields the server corrected before answering, in plain language. */
  corrections: readonly string[];
  /** Why the fallback ran. Null in model mode. */
  reason: string | null;
};

export type InterpretationResult = {
  draft: UpdateDraft;
  interpretation: DraftInterpretation;
};

type InterpretInput = {
  text: string;
  stations: readonly Station[];
  stationId: string;
  source: ReportSource;
  photoUri?: string | null;
  audio?: AudioAttachment | null;
};

/** Exactly what the `interpret-report` function answers with. */
type InterpretResponse = {
  ok?: boolean;
  error?: string;
  summary?: string;
  update?: Record<string, unknown>;
  reportedFacts?: Record<string, unknown>;
  aiInferences?: unknown;
  observed?: unknown;
  corrections?: unknown;
};

function match<T extends string>(options: readonly T[], value: unknown): T | null {
  return options.find((option) => option === value) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

async function withTimeout<T>(work: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** null means the call could not be completed at all. */
async function callInterpreter(body: Record<string, unknown>): Promise<InterpretResponse | null> {
  if (!backendConfigured) return null;

  const request = (async (): Promise<InterpretResponse | null> => {
    try {
      const { data, error } = await bilt.functions.invoke<InterpretResponse>('interpret-report', {
        body,
      });
      if (error !== null || data === null) return null;
      return data;
    } catch {
      return null;
    }
  })();

  return await withTimeout(request, CALL_TIMEOUT_MS, null);
}

function readInferences(value: unknown): readonly FieldInference[] {
  if (!Array.isArray(value)) return [];

  const inferences: FieldInference[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === null) continue;
    if (typeof record.field !== 'string') continue;
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

function readCorrections(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * Turns the validated answer into a draft. The station and dish ids were already
 * checked against the closed lists server-side, and they are checked again here
 * against the stations this device is showing — an id this app does not know is
 * treated as a failed reading, not applied.
 */
function toDraft(response: InterpretResponse, input: InterpretInput): UpdateDraft | null {
  const update = asRecord(response.update);
  if (update === null) return null;

  const station = input.stations.find((entry) => entry.id === update.stationId);
  if (station === undefined) return null;

  const dishId = typeof update.dishId === 'string' ? update.dishId : null;
  if (dishId !== null && !station.dishes.some((dish) => dish.id === dishId)) return null;

  const action = match(ACTIONS, update.action);
  const priority = match(PRIORITIES, update.priority);
  if (action === null || priority === null) return null;

  const guestsWaiting =
    typeof update.guestsWaiting === 'number' && Number.isInteger(update.guestsWaiting)
      ? update.guestsWaiting
      : null;

  return {
    stationId: station.id,
    dishId,
    // Availability can only be applied to a named dish.
    availability: dishId === null ? null : match(AVAILABILITIES, update.availability),
    queue: match(QUEUES, update.queue),
    guestsWaiting,
    action,
    priority,
    // The record keeps the staff member's own words, not the model's summary.
    note: input.text.trim(),
    source: input.source,
    photoUri: input.photoUri ?? null,
    audio: input.audio ?? null,
  };
}

function readFacts(value: unknown): ReportedFacts | null {
  const record = asRecord(value);
  if (record === null) return null;
  return {
    availability: match(AVAILABILITIES, record.availability),
    queue: match(QUEUES, record.queue),
    stationClosed: record.stationClosed === true,
    stationReopened: record.stationReopened === true,
  };
}

/** The deterministic fallback, labelled so the screen can say what happened. */
function keywordResult(input: InterpretInput, reason: string): InterpretationResult {
  return {
    draft: interpretReport(input),
    interpretation: {
      mode: 'keyword',
      summary: '',
      facts: null,
      inferences: [],
      observed: null,
      corrections: [],
      reason,
    },
  };
}

export async function interpretStaffReport(input: InterpretInput): Promise<InterpretationResult> {
  const response = await callInterpreter({
    text: input.text,
    stationId: input.stationId,
    // Closed lists: the only ids and names the reading may choose from. The
    // photo is deliberately not part of this payload.
    stations: input.stations.map((station) => ({
      id: station.id,
      name: station.name,
      dishes: station.dishes.map((dish) => ({ id: dish.id, name: dish.name })),
    })),
  });

  if (response === null) return keywordResult(input, UNREACHABLE);
  if (response.ok !== true) return keywordResult(input, response.error ?? UNREACHABLE);

  const draft = toDraft(response, input);
  if (draft === null) return keywordResult(input, 'That update could not be read reliably.');

  return {
    draft,
    interpretation: {
      mode: 'model',
      summary: typeof response.summary === 'string' ? response.summary : '',
      facts: readFacts(response.reportedFacts),
      inferences: readInferences(response.aiInferences),
      // Text only: there is never a photo observation to show.
      observed: typeof response.observed === 'string' ? response.observed : null,
      corrections: readCorrections(response.corrections),
      reason: null,
    },
  };
}
