import {
  appendFeedback,
  validateDishRating,
  validateFeedbackExplanation,
  validateFeedbackExtraction,
} from "../domain/feedback";
import { buildDemoVoucher } from "../domain/rewards";
import type { BonaFlowState } from "../domain/types";

type FeedbackRepository = {
  get(): Promise<BonaFlowState>;
  replace(state: BonaFlowState): Promise<BonaFlowState>;
};

type RatedFeedbackInput = {
  extraction?: unknown;
  transcript?: unknown;
  rating?: unknown;
};

export async function submitRatedFeedback(
  repository: FeedbackRepository,
  input: RatedFeedbackInput,
  id: string,
  now: string,
) {
  const current = await repository.get();
  const extraction = validateFeedbackExtraction(input.extraction, current);
  const rating = validateDishRating(input.rating);
  const transcript = validateFeedbackExplanation(input.transcript);
  const next = appendFeedback(
    current,
    extraction,
    rating,
    transcript,
    id,
    now,
  );
  const { feedback: currentFeedback, ...currentOperational } = current;
  const { feedback: nextFeedback, ...nextOperational } = next;
  if (JSON.stringify(currentOperational) !== JSON.stringify(nextOperational)) {
    throw new Error("Feedback isolation check failed.");
  }
  await repository.replace(next);
  return {
    feedbackCount: nextFeedback.length,
    voucher: buildDemoVoucher(current.event.id),
  };
}
