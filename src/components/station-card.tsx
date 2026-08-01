import type { BonaFlowState, DietFilter, Station } from "@/domain/types";
import { DishCard } from "./dish-card";

const queueLabel = {
  low: "Low queue",
  medium: "Medium queue",
  high: "High queue",
  unknown: "Queue unknown",
} as const;

function dishMatchesFilter(
  state: BonaFlowState,
  dishId: string,
  filter: DietFilter,
) {
  if (filter === "all") return true;
  return (
    state.dishes
      .find((dish) => dish.id === dishId)
      ?.dietTags.includes(filter) ?? false
  );
}

export function stationHasAvailableMatch(
  state: BonaFlowState,
  station: Station,
  filter: DietFilter,
) {
  return station.dishes.some(
    (placement) =>
      placement.availability === "available" &&
      dishMatchesFilter(state, placement.dishId, filter),
  );
}

export function StationCard({
  state,
  station,
  filter,
}: {
  state: BonaFlowState;
  station: Station;
  filter: DietFilter;
}) {
  const placements = station.dishes.filter((placement) =>
    dishMatchesFilter(state, placement.dishId, filter),
  );

  return (
    <section className="station-card">
      <header className="station-header">
        <span
          className={`status-dot status-${station.status}`}
          aria-label={`${station.status} station status`}
        />
        <div>
          <h2>{station.name}</h2>
          <p>{station.location}</p>
        </div>
        <div className="station-metrics">
          <span>{queueLabel[station.queueLevel]}</span>
          <time dateTime={station.lastUpdatedAt}>
            {new Date(station.lastUpdatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      </header>
      <div className="dish-list">
        {placements.map((placement) => {
          const dish = state.dishes.find(
            (candidate) => candidate.id === placement.dishId,
          );
          return dish ? (
            <DishCard
              dish={dish}
              availability={placement.availability}
              key={placement.dishId}
            />
          ) : null;
        })}
      </div>
    </section>
  );
}
