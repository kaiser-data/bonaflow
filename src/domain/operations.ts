import type { BonaFlowState } from "./types";

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
  const reasons = {
    portion_too_large: 0,
    not_tasty: 0,
    dietary_mismatch: 0,
    other: 0,
    unknown: 0,
  };
  for (const item of state.feedback) {
    leftovers[item.leftoverAmount] += 1;
    reasons[item.reason] += 1;
  }
  return { total: state.feedback.length, leftovers, reasons };
}
