import { describe, expect, it } from "vitest";
import { applyExtraction, resetState } from "./mutations";
import { recommendStation } from "./recommendations";
import { SEED_STATE } from "./seed";
import { validateExtraction } from "./validation";

const soldOut = {
  stationId: "station-b",
  stationName: "Atrium",
  dishId: "vegan-chickpeas-quinoa-salad",
  dishName: "Vegan Chickpeas Quinoa Salad",
  availability: "sold_out",
  queueLevel: "high",
  reportedGuestCount: null,
  issueType: "sold_out",
  priority: "urgent",
  reportedFacts: ["The item is sold out."],
  aiInferences: [],
  recommendedAction: "Replenish the salad.",
  recommendedAlternativeStationId: null,
  guestAnnouncement: "The Atrium salad is sold out.",
  confidence: 1,
} as const;

describe("BonaFlow domain", () => {
  it("rejects invented station and dish identifiers", () => {
    expect(() =>
      validateExtraction({ ...soldOut, stationId: "station-x" }, SEED_STATE),
    ).toThrow(/station/i);
    expect(() =>
      validateExtraction({ ...soldOut, dishId: "dish-x" }, SEED_STATE),
    ).toThrow(/dish/i);
  });

  it("applies availability, status, alert, task, and counter in sequence", () => {
    const next = applyExtraction(
      SEED_STATE,
      soldOut,
      "2026-08-01T14:40:00.000Z",
    );
    const atrium = next.stations.find(
      (station) => station.id === "station-b",
    )!;
    expect(
      atrium.dishes.find((dish) => dish.dishId === soldOut.dishId)
        ?.availability,
    ).toBe("sold_out");
    expect(atrium.status).toBe("red");
    expect(next.alerts[0]).toMatchObject({
      stationId: "station-b",
      priority: "urgent",
    });
    expect(next.tasks[0]).toMatchObject({
      stationId: "station-b",
      status: "open",
    });
    expect(next.staffUpdateCount).toBe(1);
  });

  it("resets to the exact seed", () => {
    const changed = applyExtraction(
      SEED_STATE,
      soldOut,
      "2026-08-01T14:40:00.000Z",
    );
    expect(resetState()).toEqual(SEED_STATE);
    expect(resetState()).not.toBe(changed);
  });

  it("ranks by queue and excludes the current station", () => {
    const state = structuredClone(SEED_STATE);
    state.stations
      .find((station) => station.id === "station-a")!
      .dishes.push({
        dishId: "vegan-chickpeas-quinoa-salad",
        availability: "available",
      });
    state.stations.find(
      (station) => station.id === "station-a",
    )!.queueLevel = "medium";
    state.stations
      .find((station) => station.id === "station-c")!
      .dishes.push({
        dishId: "vegan-chickpeas-quinoa-salad",
        availability: "available",
      });
    state.stations.find(
      (station) => station.id === "station-c",
    )!.queueLevel = "low";
    expect(recommendStation(state, "vegan", "station-b")?.id).toBe(
      "station-c",
    );
  });
});
