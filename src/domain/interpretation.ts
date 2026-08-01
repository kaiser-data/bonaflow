import { recommendStation } from "./recommendations";
import type {
  Availability,
  BonaFlowState,
  Extraction,
  IssueType,
  Priority,
  QueueLevel,
} from "./types";

export type QuickAction =
  | "stock_low"
  | "sold_out"
  | "replenished"
  | "queue_increasing"
  | "queue_cleared"
  | "station_closed";

const dishScopedActions = new Set<QuickAction>([
  "stock_low",
  "sold_out",
  "replenished",
]);

function findAlternative(
  state: BonaFlowState,
  stationId: string,
  dishId: string,
) {
  const dish = state.dishes.find((candidate) => candidate.id === dishId);
  const diet = dish?.dietTags.find(
    (tag) =>
      tag === "vegan" ||
      tag === "vegetarian" ||
      tag === "gluten_free" ||
      tag === "halal",
  );
  return diet ? recommendStation(state, diet, stationId)?.id ?? null : null;
}

function makeExtraction({
  state,
  stationId,
  dishId,
  availability,
  queueLevel,
  issueType,
  priority,
  fact,
  action,
  announcement,
  reportedGuestCount = null,
  confidence = 1,
  aiInferences = [],
}: {
  state: BonaFlowState;
  stationId: string;
  dishId: string;
  availability: Availability;
  queueLevel: QueueLevel;
  issueType: IssueType;
  priority: Priority;
  fact: string;
  action: string;
  announcement: string;
  reportedGuestCount?: number | null;
  confidence?: number;
  aiInferences?: string[];
}): Extraction {
  const station = state.stations.find((candidate) => candidate.id === stationId);
  if (!station) throw new Error(`Unknown stationId: ${stationId}`);
  const dish = state.dishes.find((candidate) => candidate.id === dishId);
  if (!dish || !station.dishes.some((item) => item.dishId === dishId)) {
    throw new Error(`Unknown dishId for ${station.name}: ${dishId}`);
  }
  return {
    stationId,
    stationName: station.name,
    dishId,
    dishName: dish.name,
    availability,
    queueLevel,
    reportedGuestCount,
    issueType,
    priority,
    reportedFacts: [fact],
    aiInferences,
    recommendedAction: action,
    recommendedAlternativeStationId: findAlternative(state, stationId, dishId),
    guestAnnouncement: announcement,
    confidence,
  };
}

export function quickActionExtraction(
  action: QuickAction,
  stationId: string,
  dishId: string | undefined,
  state: BonaFlowState,
): Extraction {
  const station = state.stations.find((candidate) => candidate.id === stationId);
  if (!station) throw new Error(`Unknown stationId: ${stationId}`);
  if (dishScopedActions.has(action) && !dishId) {
    throw new Error("This quick action requires a dishId.");
  }
  const selectedDishId = dishId ?? station.dishes[0]?.dishId;
  if (!selectedDishId) throw new Error("The selected station has no dishes.");
  const dish = state.dishes.find((candidate) => candidate.id === selectedDishId)!;

  const definitions: Record<
    QuickAction,
    Omit<Parameters<typeof makeExtraction>[0], "state" | "stationId" | "dishId">
  > = {
    stock_low: {
      availability: "low",
      queueLevel: station.queueLevel,
      issueType: "low_stock",
      priority: "high",
      fact: `${dish.name} is running low.`,
      action: `Replenish ${dish.name}.`,
      announcement: `${station.name} is running low on ${dish.name}.`,
    },
    sold_out: {
      availability: "sold_out",
      queueLevel: station.queueLevel,
      issueType: "sold_out",
      priority: "urgent",
      fact: `${dish.name} is sold out.`,
      action: `Replenish ${dish.name} urgently.`,
      announcement: `${dish.name} at ${station.name} is sold out.`,
    },
    replenished: {
      availability: "available",
      queueLevel: station.queueLevel,
      issueType: "resolved",
      priority: "low",
      fact: `Replenishment arrived for ${dish.name}.`,
      action: `Return ${dish.name} to service.`,
      announcement: `${dish.name} is available again at ${station.name}.`,
    },
    queue_increasing: {
      availability: "uncertain",
      queueLevel: "high",
      issueType: "queue",
      priority: "high",
      fact: `The queue at ${station.name} is increasing.`,
      action: `Send queue support to ${station.name}.`,
      announcement: `${station.name} is busy. Consider a quieter station.`,
    },
    queue_cleared: {
      availability: "uncertain",
      queueLevel: "low",
      issueType: "resolved",
      priority: "low",
      fact: `The queue at ${station.name} has cleared.`,
      action: `No queue action needed.`,
      announcement: `${station.name} now has a short queue.`,
    },
    station_closed: {
      availability: "uncertain",
      queueLevel: "unknown",
      issueType: "closure",
      priority: "urgent",
      fact: `${station.name} is temporarily closed.`,
      action: `Check and reopen ${station.name}.`,
      announcement: `${station.name} is temporarily closed.`,
    },
  };

  return makeExtraction({
    state,
    stationId,
    dishId: selectedDishId,
    ...definitions[action],
  });
}

export function interpretKeywords(
  transcript: string,
  stationId: string,
  state: BonaFlowState,
): Extraction {
  const lower = transcript.toLowerCase();
  const station = state.stations.find((candidate) => candidate.id === stationId);
  if (!station) throw new Error(`Unknown stationId: ${stationId}`);
  const placement =
    station.dishes.find((item) => {
      const dish = state.dishes.find((candidate) => candidate.id === item.dishId);
      return dish && lower.includes(dish.name.toLowerCase());
    }) ?? station.dishes[0];
  if (!placement) throw new Error("The selected station has no dishes.");
  const dish = state.dishes.find((candidate) => candidate.id === placement.dishId)!;
  const countMatch = transcript.match(/\b(\d{1,4})\b/);
  const reportedGuestCount = countMatch ? Number(countMatch[1]) : null;
  const isSoldOut = /sold out|finished|gone|empty/.test(lower);
  const isLow = /almost finished|running low|nearly empty|low/.test(lower);
  const isQueue = /queue|waiting/.test(lower);

  return makeExtraction({
    state,
    stationId,
    dishId: dish.id,
    availability: isSoldOut ? "sold_out" : isLow ? "low" : "uncertain",
    queueLevel: isQueue ? "high" : "unknown",
    issueType: isSoldOut ? "sold_out" : isLow ? "low_stock" : isQueue ? "queue" : "other",
    priority: isSoldOut ? "urgent" : isLow || isQueue ? "high" : "medium",
    fact: transcript.trim(),
    action: isSoldOut || isLow ? `Replenish ${dish.name}.` : `Check ${station.name}.`,
    announcement:
      isSoldOut || isLow
        ? `${station.name} is running low. Check another available station.`
        : `There is an update from ${station.name}.`,
    reportedGuestCount,
    confidence: isSoldOut || isLow || isQueue ? 0.86 : 0.45,
    aiInferences:
      isSoldOut || isLow
        ? [`Replenishment may be needed at ${station.name}.`]
        : ["The report needs staff review."],
  });
}
