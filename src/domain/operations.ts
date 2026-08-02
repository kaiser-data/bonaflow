import type { BonaFlowState, DishRating } from "./types";

export function completeTask(
  state: BonaFlowState,
  taskId: string,
  now: string,
): BonaFlowState {
  const next = structuredClone(state);
  const task = next.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status !== "open") throw new Error("Open task not found.");
  task.status = "completed";
  task.completedAt = now;
  return next;
}

export function setIncentiveActive(
  state: BonaFlowState,
  active: boolean,
): BonaFlowState {
  const next = structuredClone(state);
  next.incentive.active = active;
  return next;
}

export function feedbackSummary(state: BonaFlowState) {
  const leftovers = { none: 0, some: 0, most: 0, unknown: 0 };
  const ratings: Record<DishRating, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  const reasons = {
    portion_too_large: 0,
    not_tasty: 0,
    dietary_mismatch: 0,
    other: 0,
    unknown: 0,
  };
  let ratedTotal = 0;
  let ratingSum = 0;
  let voiceResponses = 0;
  for (const item of state.feedback) {
    leftovers[item.leftoverAmount] += 1;
    reasons[item.reason] += 1;
    if (
      Number.isInteger(item.rating) &&
      Number(item.rating) >= 1 &&
      Number(item.rating) <= 5
    ) {
      const rating = item.rating as DishRating;
      ratings[rating] += 1;
      ratedTotal += 1;
      ratingSum += rating;
    }
    if (item.transcript.trim().length >= 5) voiceResponses += 1;
  }
  return {
    total: state.feedback.length,
    ratedTotal,
    averageRating: ratedTotal === 0 ? null : ratingSum / ratedTotal,
    ratings,
    voiceResponses,
    leftovers,
    reasons,
  };
}
