import { z } from "zod";
import type { BonaFlowState, Extraction } from "./types";

const extractionSchema = z.object({
  stationId: z.string().min(1),
  stationName: z.string(),
  dishId: z.string().min(1),
  dishName: z.string(),
  availability: z.enum(["available", "low", "sold_out", "uncertain"]),
  queueLevel: z.enum(["low", "medium", "high", "unknown"]),
  reportedGuestCount: z.number().nonnegative().nullable(),
  issueType: z.enum([
    "low_stock",
    "sold_out",
    "queue",
    "closure",
    "resolved",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  reportedFacts: z.array(z.string()),
  aiInferences: z.array(z.string()),
  recommendedAction: z.string(),
  recommendedAlternativeStationId: z.string().nullable(),
  guestAnnouncement: z.string(),
  confidence: z.number().min(0).max(1),
});

export function validateExtraction(
  value: unknown,
  state: BonaFlowState,
): Extraction {
  const extraction = extractionSchema.parse(value);
  const station = state.stations.find(
    (candidate) => candidate.id === extraction.stationId,
  );
  if (!station) {
    throw new Error(`Unknown stationId: ${extraction.stationId}`);
  }
  const dish = state.dishes.find(
    (candidate) => candidate.id === extraction.dishId,
  );
  if (!dish) {
    throw new Error(`Unknown dishId: ${extraction.dishId}`);
  }
  if (!station.dishes.some((placement) => placement.dishId === dish.id)) {
    throw new Error(`${dish.id} is not placed at station ${station.id}`);
  }
  if (
    extraction.recommendedAlternativeStationId &&
    !state.stations.some(
      (candidate) =>
        candidate.id === extraction.recommendedAlternativeStationId,
    )
  ) {
    throw new Error(
      `Unknown recommended stationId: ${extraction.recommendedAlternativeStationId}`,
    );
  }
  return extraction;
}
