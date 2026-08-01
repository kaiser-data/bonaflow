import type {
  BonaFlowState,
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

export function interpretFeedbackKeywords(
  text: string,
  selectedDishId: string,
  state: BonaFlowState,
): FeedbackExtraction {
  if (!state.dishes.some((dish) => dish.id === selectedDishId)) {
    throw new Error(`Unknown feedback dishId: ${selectedDishId}`);
  }
  const lower = text.toLowerCase();
  const leftoverAmount = /most(?: of (?:it|the [\w ]+))? (?:was )?left|almost all|barely ate|hardly ate/.test(lower)
    ? "most"
    : /some(?: of (?:it|the [\w ]+))? (?:was )?left|half left|didn't finish|did not finish/.test(lower)
      ? "some"
      : /none left|finished it|ate it all|empty bowl/.test(lower)
        ? "none"
        : "unknown";
  const reason = /portion.{0,12}(large|big)|too much|too large/.test(lower)
    ? "portion_too_large"
    : /not tasty|didn't taste|did not taste|bland|too salty|didn't like|did not like/.test(lower)
      ? "not_tasty"
      : /diet|allerg|ingredient|wrong dish/.test(lower)
        ? "dietary_mismatch"
        : text.trim()
          ? "other"
          : "unknown";
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

const leftoverLabel = {
  none: "No food",
  some: "Some of",
  most: "Most of",
  unknown: "An unknown amount of",
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
  return `${leftoverLabel[extraction.leftoverAmount]} the ${dish.name} left, ${reasonLabel[extraction.reason]}`;
}

export function appendFeedback(
  state: BonaFlowState,
  extraction: FeedbackExtraction,
  transcript: string,
  id: string,
  now: string,
): BonaFlowState {
  const validated = validateFeedbackExtraction(extraction, state);
  const record: FeedbackRecord = {
    id,
    ...validated,
    transcript,
    createdAt: now,
  };
  return { ...structuredClone(state), feedback: [...state.feedback, record] };
}
