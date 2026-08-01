import type {
  Dish,
  LeftoverAmount,
  LeftoverReason,
  MealRating,
  RatingDraft,
  RatingLanguage,
  RatingSource,
  Station,
  AudioAttachment,
} from '@/lib/store';

/**
 * Guest feedback: the closed vocabulary, the offline reader, and the counting.
 *
 * Everything here is plain deterministic code with no network and no model. It is
 * what runs when the reading service cannot be reached, and it is what turns
 * hundreds of one-line reviews into the two numbers a kitchen can act on: how a
 * dish scored, and how much of it came back.
 */

/** Shown on the confirmation screen whenever the offline reader was used. */
export const OFFLINE_RATING_LABEL =
  'read on this phone — no network, please check the fields below';

export const LEFTOVER_OPTIONS: readonly { value: LeftoverAmount; label: string }[] = [
  { value: 'none', label: 'Ate it all' },
  { value: 'a_little', label: 'A little left' },
  { value: 'about_half', label: 'About half left' },
  { value: 'most_of_it', label: 'Most of it left' },
];

const LEFTOVER_LABELS: Record<LeftoverAmount, string> = {
  none: 'ate it all',
  a_little: 'a little left',
  about_half: 'about half left',
  most_of_it: 'most of it left',
};

const REASON_LABELS: Record<LeftoverReason, string> = {
  portion_too_large: 'Portion too large',
  not_tasty: "Didn't taste good",
  too_spicy: 'Too spicy',
  too_salty: 'Too salty',
  bland: 'Needed seasoning',
  cold: 'Not warm enough',
  texture: 'Texture was off',
  not_fresh: "Didn't seem fresh",
  disliked_ingredient: 'An ingredient I avoid',
  no_time: 'I ran out of time',
  wanted_something_else: 'I wanted a different dish',
  other: 'Something else',
};

/**
 * Reason labels are written from the guest's side, never as an accusation and
 * never as a judgement of the kitchen. "Needed seasoning" is something a person
 * will actually tap; "bad food" is not.
 */
export const REASON_OPTIONS: readonly { value: LeftoverReason; label: string }[] = [
  { value: 'portion_too_large', label: REASON_LABELS.portion_too_large },
  { value: 'not_tasty', label: REASON_LABELS.not_tasty },
  { value: 'too_spicy', label: REASON_LABELS.too_spicy },
  { value: 'too_salty', label: REASON_LABELS.too_salty },
  { value: 'bland', label: REASON_LABELS.bland },
  { value: 'cold', label: REASON_LABELS.cold },
  { value: 'texture', label: REASON_LABELS.texture },
  { value: 'not_fresh', label: REASON_LABELS.not_fresh },
  { value: 'disliked_ingredient', label: REASON_LABELS.disliked_ingredient },
  { value: 'no_time', label: REASON_LABELS.no_time },
  { value: 'wanted_something_else', label: REASON_LABELS.wanted_something_else },
  { value: 'other', label: REASON_LABELS.other },
];

export function reasonLabel(reason: LeftoverReason): string {
  return REASON_LABELS[reason];
}

export function leftoverLabel(leftover: LeftoverAmount): string {
  return LEFTOVER_LABELS[leftover];
}

/** How much of a bowl each answer stands for, used for the waste share. */
const LEFTOVER_SHARE: Record<LeftoverAmount, number> = {
  none: 0,
  a_little: 0.15,
  about_half: 0.5,
  most_of_it: 0.85,
};

/**
 * The same keyword table the reading service uses to decide whether a reason was
 * actually said. Kept here too so the offline reader behaves identically when
 * there is no network.
 */
const REASON_RULES: Record<LeftoverReason, RegExp> = {
  portion_too_large:
    /too much|too big|so much food|couldn'?t finish|could not finish|portion (is|was) (huge|big|large)|zu viel|zu groß|riesig|nicht aufessen|nicht geschafft/i,
  not_tasty:
    /not tasty|didn'?t taste|tast(ed|es) bad|no taste|not nice|not good|awful|horrible|nicht lecker|schmeckt nicht|nicht geschmeckt|nicht gut/i,
  too_spicy: /too spicy|too hot|chilli|chili|zu scharf/i,
  too_salty: /too salty|too much salt|versalzen|zu salzig/i,
  bland: /bland|no flavour|no flavor|needs salt|tasteless|fade|geschmacklos/i,
  cold: /\bcold\b|lukewarm|not warm|\bkalt\b|lauwarm|nicht warm/i,
  texture: /soggy|mushy|\bdry\b|overcooked|undercooked|chewy|matschig|trocken|verkocht|zäh/i,
  not_fresh: /not fresh|stale|wilted|nicht frisch|nicht mehr frisch/i,
  disliked_ingredient:
    /don'?t like|do not like|picked out|without the|mag ich nicht|ohne die|rausgesucht/i,
  no_time: /no time|had to (go|leave|run)|in a hurry|keine zeit|musste (los|weg)|eilig/i,
  wanted_something_else:
    /wanted (the|something)|sold out|nothing left|second choice|instead|wollte (eigentlich|lieber)|ausverkauft|nichts mehr|stattdessen/i,
  other: /$^/,
};

/** Checked longest-claim first, so "about half" is not read as "a little". */
const LEFTOVER_RULES: readonly { pattern: RegExp; value: LeftoverAmount }[] = [
  {
    pattern: /most of it|nearly all|barely (ate|touched)|fast alles|kaum (gegessen|angerührt)/i,
    value: 'most_of_it',
  },
  { pattern: /half|hälfte|halbe/i, value: 'about_half' },
  {
    pattern: /a (little|bit) (left|over)|ein (wenig|bisschen) (übrig|über)|etwas übrig/i,
    value: 'a_little',
  },
  {
    pattern:
      /ate it all|finished it|nothing left over|alles gegessen|aufgegessen|komplett gegessen/i,
    value: 'none',
  },
];

const GERMAN_MARKERS =
  /\b(ich|nicht|war|sehr|und|aber|zu|viel|lecker|schmeckt|gut|übrig|habe|mir|den|die|das)\b/i;

/** Written numbers a guest might use for a score, in both languages. */
const SCORE_WORDS: readonly { pattern: RegExp; value: number }[] = [
  { pattern: /\b(one|eins|ein)\s*(star|stern|sterne|von 5|out of 5)/i, value: 1 },
  { pattern: /\b(two|zwei)\s*(stars|sterne|von 5|out of 5)/i, value: 2 },
  { pattern: /\b(three|drei)\s*(stars|sterne|von 5|out of 5)/i, value: 3 },
  { pattern: /\b(four|vier)\s*(stars|sterne|von 5|out of 5)/i, value: 4 },
  { pattern: /\b(five|fünf)\s*(stars|sterne|von 5|out of 5)/i, value: 5 },
];

/** The language the guest used, so the review is stored as what they said. */
export function detectLanguage(text: string): RatingLanguage {
  if (text.trim().length === 0) return 'other';
  return GERMAN_MARKERS.test(text) ? 'de' : 'en';
}

/**
 * A score is only taken when the guest really gave one, as a digit or in words.
 * A warm-sounding sentence with no number stays unscored: an estimate presented
 * as somebody's rating is a lie, however good the guess is.
 */
export function scoreInText(text: string): number | null {
  const digits = /(^|[^0-9])([1-5])\s*(\/\s*5|out of 5|von 5|stars?|sterne?)/i.exec(text);
  if (digits !== null) return Number(digits[2]);

  for (const rule of SCORE_WORDS) {
    if (rule.pattern.test(text)) return rule.value;
  }

  return null;
}

export function reasonsInText(text: string): readonly LeftoverReason[] {
  return REASON_OPTIONS.map((option) => option.value).filter((reason) =>
    REASON_RULES[reason].test(text),
  );
}

export function leftoverInText(text: string): LeftoverAmount | null {
  return LEFTOVER_RULES.find((rule) => rule.pattern.test(text))?.value ?? null;
}

/**
 * The offline reader. Everything it fills in comes from words that are literally
 * in the sentence, which is why it can never be wrong about what was said — only
 * incomplete, and the guest is looking at every field before it is stored.
 */
export function interpretRatingText(input: {
  text: string;
  stationId: string;
  dishId: string;
  source: RatingSource;
  audio?: AudioAttachment | null;
}): RatingDraft {
  const text = input.text.trim();

  return {
    stationId: input.stationId,
    dishId: input.dishId,
    score: scoreInText(text),
    leftover: leftoverInText(text),
    reasons: reasonsInText(text),
    comment: text,
    language: detectLanguage(text),
    source: input.source,
    audio: input.audio ?? null,
  };
}

/** A review built from taps alone, with no words at all. */
export function buildTapDraft(input: {
  stationId: string;
  dishId: string;
  score: number | null;
  leftover: LeftoverAmount | null;
  reasons: readonly LeftoverReason[];
}): RatingDraft {
  return {
    stationId: input.stationId,
    dishId: input.dishId,
    score: input.score,
    leftover: input.leftover,
    reasons: input.reasons,
    comment: '',
    language: 'other',
    source: 'taps',
    audio: null,
  };
}

/* ---------------------------------------------------------------------------
 * Counting, for the kitchen.
 * ------------------------------------------------------------------------- */

export type ReasonCount = { reason: LeftoverReason; count: number };

export type DishFeedback = {
  station: Station;
  dish: Dish;
  /** Reviews for this dish. */
  count: number;
  /** Average of the scores guests actually gave, or null if nobody scored it. */
  averageScore: number | null;
  scoredCount: number;
  /** Reviews that said how much was left. */
  leftoverReports: number;
  /**
   * Share of a bowl left, averaged over the reviews that reported it. Null when
   * nobody said — shown as "not reported", never as zero waste.
   */
  wasteShare: number | null;
  reasons: readonly ReasonCount[];
  /** The guest's own words, newest first, for the reviews that had any. */
  comments: readonly { text: string; language: RatingLanguage; createdAt: string }[];
};

function averageOf(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function rankReasons(ratings: readonly MealRating[]): readonly ReasonCount[] {
  const counts = new Map<LeftoverReason, number>();
  for (const rating of ratings) {
    for (const reason of rating.reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort(
      (a, b) => b.count - a.count || reasonLabel(a.reason).localeCompare(reasonLabel(b.reason)),
    );
}

/**
 * One row per dish on the counters, newest concern first: the dishes with the
 * most left behind come first, because that is the row a kitchen acts on. Dishes
 * with no reviews are kept and shown as having none, so an untouched dish is
 * visibly untouched rather than absent.
 */
export function summariseFeedback(
  stations: readonly Station[],
  ratings: readonly MealRating[],
): readonly DishFeedback[] {
  const rows: DishFeedback[] = [];

  for (const station of stations) {
    for (const dish of station.dishes) {
      const own = ratings.filter((rating) => rating.dishId === dish.id);
      const scores = own
        .map((rating) => rating.score)
        .filter((score): score is number => score !== null);
      const shares = own
        .map((rating) => rating.leftover)
        .filter((leftover): leftover is LeftoverAmount => leftover !== null)
        .map((leftover) => LEFTOVER_SHARE[leftover]);

      rows.push({
        station,
        dish,
        count: own.length,
        averageScore: averageOf(scores),
        scoredCount: scores.length,
        leftoverReports: shares.length,
        wasteShare: averageOf(shares),
        reasons: rankReasons(own),
        comments: own
          .filter((rating) => rating.comment.trim().length > 0)
          .map((rating) => ({
            text: rating.comment.trim(),
            language: rating.language,
            createdAt: rating.createdAt,
          })),
      });
    }
  }

  return rows.sort((a, b) => (b.wasteShare ?? -1) - (a.wasteShare ?? -1) || b.count - a.count);
}

/** Waste share as a percentage line, or an honest gap. */
export function wasteLine(feedback: DishFeedback): string {
  if (feedback.wasteShare === null) return 'no leftovers reported yet';
  return `${Math.round(feedback.wasteShare * 100)}% of a bowl left on average · ${feedback.leftoverReports} reported`;
}

/** Average score as a line, or an honest gap. */
export function scoreLine(feedback: DishFeedback): string {
  if (feedback.averageScore === null) return 'nobody has scored this dish';
  return `${feedback.averageScore.toFixed(1)} of 5 · ${feedback.scoredCount} scored`;
}
