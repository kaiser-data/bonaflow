import { buildRecommendations } from "./recommendations";
import { SEED_STATE } from "./seed";
import type { BonaFlowState, Extraction, StationStatus } from "./types";
import { validateExtraction } from "./validation";

function deriveStatus(extraction: Extraction): StationStatus {
  if (extraction.issueType === "closure" || extraction.availability === "sold_out") {
    return "red";
  }
  if (
    extraction.availability === "low" ||
    extraction.queueLevel === "high" ||
    extraction.issueType === "low_stock"
  ) {
    return "orange";
  }
  if (
    extraction.issueType === "resolved" ||
    extraction.availability === "available"
  ) {
    return "green";
  }
  return "grey";
}

export function applyExtraction(
  state: BonaFlowState,
  value: unknown,
  now: string,
): BonaFlowState {
  const extraction = validateExtraction(value, state);
  const next = structuredClone(state);
  const station = next.stations.find(
    (candidate) => candidate.id === extraction.stationId,
  )!;
  const placement = station.dishes.find(
    (candidate) => candidate.dishId === extraction.dishId,
  )!;

  if (extraction.availability !== "uncertain") {
    placement.availability = extraction.availability;
  }
  if (extraction.queueLevel !== "unknown") {
    station.queueLevel = extraction.queueLevel;
  }
  station.status = deriveStatus(extraction);
  station.lastUpdatedAt = now;

  const suffix = `${now}-${next.staffUpdateCount + 1}`;
  next.alerts.unshift({
    id: `alert-${suffix}`,
    stationId: station.id,
    dishId: extraction.dishId,
    issueType: extraction.issueType,
    priority: extraction.priority,
    message: extraction.guestAnnouncement || extraction.reportedFacts.join(" "),
    recommendedAction: extraction.recommendedAction,
    createdAt: now,
    active: extraction.issueType !== "resolved",
  });

  if (
    extraction.issueType === "low_stock" ||
    extraction.issueType === "sold_out"
  ) {
    next.tasks.unshift({
      id: `task-${suffix}`,
      stationId: station.id,
      dishId: extraction.dishId,
      title: extraction.recommendedAction,
      priority: extraction.priority,
      status: "open",
      createdAt: now,
      completedAt: null,
    });
  }
  if (extraction.issueType === "resolved") {
    next.tasks = next.tasks.map((task) =>
      task.stationId === station.id && task.dishId === extraction.dishId
        ? { ...task, status: "completed", completedAt: now }
        : task,
    );
  }

  next.staffUpdateCount += 1;
  next.recommendations = buildRecommendations(
    next,
    station.status === "red" ? station.id : undefined,
  );
  return next;
}

export function resetState(): BonaFlowState {
  return structuredClone(SEED_STATE);
}
