import type {
  BonaFlowState,
  DishRating,
  FeedbackExtraction,
  FeedbackRecord,
} from "./types";

const leftoverValues = new Set(["none", "some", "most", "unknown"]);
const reasonValues = new Set([
  "portion_too_large",
  "not_tasty",
  "dietary_mismatch",
  "other",
  "unknown",
]);

export function validateDishRating(value: unknown): DishRating {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
    throw new Error("Rating must be an integer from 1 to 5.");
  }
  return value as DishRating;
}

export function validateFeedbackExplanation(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 5) {
    throw new Error(
      "Feedback explanation must contain at least five characters.",
    );
  }
  return value.trim();
}

export function validateFeedbackExtraction(
  value: unknown,
  state: BonaFlowState,
): FeedbackExtraction {
  if (!value || typeof value !== "object") throw new Error("Feedback extraction is required.");
  const item = value as Partial<FeedbackExtraction>;
  if (!state.dishes.some((dish) => dish.id === item.dishId)) {
    throw new Error(`Unknown feedback dishId: ${String(item.dishId)}`);
  }
  if (!leftoverValues.has(String(item.leftoverAmount))) {
    throw new Error("Invalid leftoverAmount.");
  }
  if (!reasonValues.has(String(item.reason))) throw new Error("Invalid feedback reason.");
  if (!Array.isArray(item.reportedFacts) || !item.reportedFacts.every((fact) => typeof fact === "string")) {
    throw new Error("Invalid reportedFacts.");
  }
  if (!Array.isArray(item.aiInferences) || !item.aiInferences.every((fact) => typeof fact === "string")) {
    throw new Error("Invalid aiInferences.");
  }
  if (typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1) {
    throw new Error("Invalid feedback confidence.");
  }
  return item as FeedbackExtraction;
}

// Ordered keyword fallback for when the language model is unreachable.
// First match wins, so the patterns must not overlap. German covers only the
// unambiguous phrases — a confident wrong guess is worse than "unknown".
const leftoverPatterns: [RegExp, FeedbackExtraction["leftoverAmount"]][] = [
  [/most(?: of (?:it|the [\w ]+))? (?:was )?left|almost all|barely ate|hardly ate|das meiste/, "most"],
  [/some(?: of (?:it|the [\w ]+))? (?:was )?left|half left|didn't finish|did not finish|h(?:ä|ae)lfte/, "some"],
  [/none left|finished it|ate it all|empty bowl/, "none"],
];

const reasonPatterns: [RegExp, FeedbackExtraction["reason"]][] = [
  [/portion.{0,12}(large|big)|too much|too large|zu (?:viel|gross|groß)/, "portion_too_large"],
  [/not tasty|didn't taste|did not taste|bland|too salty|didn't like|did not like/, "not_tasty"],
  [/diet|allerg|ingredient|wrong dish/, "dietary_mismatch"],
];

function matchFirst<T>(text: string, patterns: [RegExp, T][]): T | null {
  return patterns.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export function interpretFeedbackKeywords(
  text: string,
  selectedDishId: string,
  state: BonaFlowState,
): FeedbackExtraction {
  if (!state.dishes.some((dish) => dish.id === selectedDishId)) {
    throw new Error(`Unknown feedback dishId: ${selectedDishId}`);
  }
  const lower = text.toLowerCase();
  const leftoverAmount = matchFirst(lower, leftoverPatterns) ?? "unknown";
  const reason =
    matchFirst(lower, reasonPatterns) ?? (text.trim() ? "other" : "unknown");
  return {
    dishId: selectedDishId,
    leftoverAmount,
    reason,
    reportedFacts: text.trim() ? [text.trim()] : [],
    aiInferences:
      reason === "other" || reason === "unknown"
        ? ["The reason needs review before menu planning."]
        : [],
    confidence:
      leftoverAmount !== "unknown" && reason !== "unknown" ? 0.88 : 0.55,
  };
}

// Each label is a full clause, so every value reads as a correct sentence.
const leftoverLabel = {
  none: "Nothing was left of",
  some: "Some was left of",
  most: "Most was left of",
  unknown: "An unknown amount was left of",
} as const;

const reasonLabel = {
  portion_too_large: "portion too large",
  not_tasty: "not tasty",
  dietary_mismatch: "dietary mismatch",
  other: "another reason",
  unknown: "reason unknown",
} as const;

export function formatFeedbackSummary(
  extraction: FeedbackExtraction,
  state: BonaFlowState,
): string {
  const dish = state.dishes.find((item) => item.id === extraction.dishId);
  if (!dish) throw new Error(`Unknown feedback dishId: ${extraction.dishId}`);
  return `${leftoverLabel[extraction.leftoverAmount]} the ${dish.name} — ${reasonLabel[extraction.reason]}`;
}

export function appendFeedback(
  state: BonaFlowState,
  extraction: FeedbackExtraction,
  rating: DishRating,
  transcript: string,
  id: string,
  now: string,
): BonaFlowState {
  const validated = validateFeedbackExtraction(extraction, state);
  const validatedRating = validateDishRating(rating);
  const record: FeedbackRecord = {
    id,
    ...validated,
    rating: validatedRating,
    transcript,
    createdAt: now,
  };
  return { ...structuredClone(state), feedback: [...state.feedback, record] };
}
