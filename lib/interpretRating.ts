import { backendConfigured, bilt } from '@/lib/backend';
import { detectLanguage, interpretRatingText, OFFLINE_RATING_LABEL } from '@/lib/ratings';
import type {
  AudioAttachment,
  FieldInference,
  LeftoverAmount,
  LeftoverReason,
  RatingDraft,
  RatingInterpretation,
  RatingLanguage,
  RatingSentiment,
  RatingSource,
  Station,
} from '@/lib/store';

/**
 * Reads a guest's review into fields.
 *
 * The reading happens in the `interpret-rating` Bilt Cloud function, which is the
 * only place the model endpoint, the API key and the model name exist. The
 * function is sent the sentence plus the closed list of dishes on today's menu,
 * and answers with fields already validated against that list.
 *
 * Two separations survive all the way to the screen:
 *
 *   - a score is only a number the guest said. A score the service worked out
 *     from the tone arrives as an inference with a confidence, and the guest taps
 *     it to accept it. Nobody's rating is invented on their behalf.
 *   - a reason is only reported when its own words are in the sentence. Reasons
 *     the service concluded arrive as suggestions, kept apart from what was said.
 *
 * The deterministic reader in lib/ratings.ts is the automatic fallback. If the
 * call fails, times out, or the answer fails validation, the keyword reader runs
 * on the phone and the confirmation screen says so. The guest checks every field
 * either way, so this degrades to something still worth storing.
 */

/** Guard against a function that never answers; the model call stops at 8s. */
const CALL_TIMEOUT_MS = 10000;

const UNREACHABLE = 'The reading service could not be reached.';

const LEFTOVERS: readonly LeftoverAmount[] = ['none', 'a_little', 'about_half', 'most_of_it'];
const SENTIMENTS: readonly RatingSentiment[] = ['positive', 'mixed', 'negative', 'unclear'];
const LANGUAGES: readonly RatingLanguage[] = ['en', 'de', 'other'];
const REASONS: readonly LeftoverReason[] = [
  'portion_too_large',
  'not_tasty',
  'too_spicy',
  'too_salty',
  'bland',
  'cold',
  'texture',
  'not_fresh',
  'disliked_ingredient',
  'no_time',
  'wanted_something_else',
  'other',
];

export type RatingInterpretationResult = {
  draft: RatingDraft;
  interpretation: RatingInterpretation;
};

type RatingInput = {
  text: string;
  stations: readonly Station[];
  stationId: string;
  dishId: string;
  source: RatingSource;
  audio?: AudioAttachment | null;
};

type RatingResponse = {
  ok?: boolean;
  error?: string;
  reportedScore?: unknown;
  reportedLeftover?: unknown;
  reportedReasons?: unknown;
  inferredReasons?: unknown;
  sentiment?: unknown;
  language?: unknown;
  aiInferences?: unknown;
  kitchenNote?: unknown;
  summary?: unknown;
  confidence?: unknown;
  corrections?: unknown;
};

function match<T extends string>(options: readonly T[], value: unknown): T | null {
  return options.find((option) => option === value) ?? null;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readReasons(value: unknown): readonly LeftoverReason[] {
  if (!Array.isArray(value)) return [];
  const reasons: LeftoverReason[] = [];
  for (const entry of value) {
    const reason = match(REASONS, entry);
    if (reason !== null && !reasons.includes(reason)) reasons.push(reason);
  }
  return reasons;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readInferences(value: unknown): readonly FieldInference[] {
  if (!Array.isArray(value)) return [];
  const inferences: FieldInference[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) continue;
    if (typeof entry.field !== 'string') continue;
    const confidence = typeof entry.confidence === 'number' ? entry.confidence : Number.NaN;
    if (!Number.isFinite(confidence)) continue;
    inferences.push({
      field: entry.field,
      value: typeof entry.value === 'string' ? entry.value : '',
      confidence: Math.min(1, Math.max(0, confidence)),
      basis: typeof entry.basis === 'string' ? entry.basis : '',
    });
  }

  return inferences;
}

function readConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
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

async function callReader(body: Record<string, unknown>): Promise<RatingResponse | null> {
  if (!backendConfigured) return null;

  const request = (async (): Promise<RatingResponse | null> => {
    try {
      const { data, error } = await bilt.functions.invoke<RatingResponse>('interpret-rating', {
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

/** The offline reader, labelled so the screen can say what happened. */
function keywordResult(input: RatingInput, reason: string): RatingInterpretationResult {
  const draft = interpretRatingText({
    text: input.text,
    stationId: input.stationId,
    dishId: input.dishId,
    source: input.source,
    audio: input.audio,
  });

  return {
    draft,
    interpretation: {
      mode: 'keyword',
      summary: '',
      confidence: 0,
      reported: { score: draft.score, leftover: draft.leftover, reasons: draft.reasons },
      suggestedReasons: [],
      inferences: [],
      sentiment: 'unclear',
      kitchenNote: '',
      corrections: [],
      reason,
    },
  };
}

/**
 * Reads one review. Always resolves: a failure anywhere returns the offline
 * reading rather than an error, because a guest who has already spoken should
 * never be told to try again.
 */
export async function interpretGuestRating(
  input: RatingInput,
): Promise<RatingInterpretationResult> {
  const text = input.text.trim();
  if (text.length === 0) return keywordResult(input, OFFLINE_RATING_LABEL);

  const dishes = input.stations.flatMap((station) =>
    station.dishes.map((dish) => ({ id: dish.id, name: dish.name })),
  );

  const response = await callReader({ text, dishes, dishId: input.dishId });
  if (response === null) return keywordResult(input, `${UNREACHABLE} ${OFFLINE_RATING_LABEL}`);
  if (response.ok !== true) {
    return keywordResult(input, `${asText(response.error) || UNREACHABLE} ${OFFLINE_RATING_LABEL}`);
  }

  const score =
    typeof response.reportedScore === 'number' &&
    Number.isInteger(response.reportedScore) &&
    response.reportedScore >= 1 &&
    response.reportedScore <= 5
      ? response.reportedScore
      : null;

  const reported = {
    score,
    leftover: match(LEFTOVERS, response.reportedLeftover),
    reasons: readReasons(response.reportedReasons),
  };

  const draft: RatingDraft = {
    stationId: input.stationId,
    dishId: input.dishId,
    score: reported.score,
    leftover: reported.leftover,
    reasons: reported.reasons,
    // The record keeps everything the guest said, not the service's summary.
    comment: text,
    language: match(LANGUAGES, response.language) ?? detectLanguage(text),
    source: input.source,
    audio: input.audio ?? null,
  };

  return {
    draft,
    interpretation: {
      mode: 'model',
      summary: asText(response.summary),
      confidence: readConfidence(response.confidence),
      reported,
      suggestedReasons: readReasons(response.inferredReasons).filter(
        (reason) => !reported.reasons.includes(reason),
      ),
      inferences: readInferences(response.aiInferences),
      sentiment: match(SENTIMENTS, response.sentiment) ?? 'unclear',
      kitchenNote: asText(response.kitchenNote),
      corrections: Array.isArray(response.corrections)
        ? response.corrections.filter((entry): entry is string => typeof entry === 'string')
        : [],
      reason: null,
    },
  };
}
