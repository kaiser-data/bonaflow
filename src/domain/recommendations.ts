import type {
  BonaFlowState,
  DietFilter,
  Station,
} from "./types";

const queueRank = { low: 0, medium: 1, high: 2, unknown: 3 } as const;

function stationHasMatch(
  state: BonaFlowState,
  station: Station,
  diet: DietFilter,
): boolean {
  if (station.status === "red") return false;
  return station.dishes.some((placement) => {
    if (placement.availability !== "available") return false;
    if (diet === "all") return true;
    const dish = state.dishes.find((candidate) => candidate.id === placement.dishId);
    return dish?.dietTags.includes(diet) ?? false;
  });
}

export function recommendStation(
  state: BonaFlowState,
  diet: DietFilter,
  excludeStationId?: string,
): Station | null {
  return (
    state.stations
      .filter((station) => station.id !== excludeStationId)
      .filter((station) => stationHasMatch(state, station, diet))
      .sort(
        (left, right) =>
          queueRank[left.queueLevel] - queueRank[right.queueLevel],
      )[0] ?? null
  );
}

export function buildRecommendations(
  state: BonaFlowState,
  excludeStationId?: string,
): BonaFlowState["recommendations"] {
  return {
    all: recommendStation(state, "all", excludeStationId)?.id ?? null,
    vegan: recommendStation(state, "vegan", excludeStationId)?.id ?? null,
    vegetarian:
      recommendStation(state, "vegetarian", excludeStationId)?.id ?? null,
    gluten_free:
      recommendStation(state, "gluten_free", excludeStationId)?.id ?? null,
    halal: recommendStation(state, "halal", excludeStationId)?.id ?? null,
  };
}
