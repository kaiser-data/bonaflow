import "server-only";
import OpenAI from "openai";
import { recommendStation } from "@/domain/recommendations";
import type { BonaFlowState, Extraction } from "@/domain/types";
import { validateExtraction } from "@/domain/validation";

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stationId: { type: "string" },
    stationName: { type: "string" },
    dishId: { type: "string" },
    dishName: { type: "string" },
    availability: { enum: ["available", "low", "sold_out", "uncertain"] },
    queueLevel: { enum: ["low", "medium", "high", "unknown"] },
    reportedGuestCount: { anyOf: [{ type: "number" }, { type: "null" }] },
    issueType: { enum: ["low_stock", "sold_out", "queue", "closure", "resolved", "other"] },
    priority: { enum: ["low", "medium", "high", "urgent"] },
    reportedFacts: { type: "array", items: { type: "string" } },
    aiInferences: { type: "array", items: { type: "string" } },
    recommendedAction: { type: "string" },
    recommendedAlternativeStationId: { anyOf: [{ type: "string" }, { type: "null" }] },
    guestAnnouncement: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "stationId", "stationName", "dishId", "dishName", "availability",
    "queueLevel", "reportedGuestCount", "issueType", "priority",
    "reportedFacts", "aiInferences", "recommendedAction",
    "recommendedAlternativeStationId", "guestAnnouncement", "confidence",
  ],
} as const;

function enforceAlternative(
  state: BonaFlowState,
  extraction: Extraction,
): Extraction {
  const dish = state.dishes.find((item) => item.id === extraction.dishId)!;
  const diet = dish.dietTags.find(
    (tag) => tag === "vegan" || tag === "vegetarian" || tag === "gluten_free" || tag === "halal",
  );
  if (!diet) return { ...extraction, recommendedAlternativeStationId: null };
  const best = recommendStation(state, diet, extraction.stationId);
  const suggested = state.stations.find(
    (station) => station.id === extraction.recommendedAlternativeStationId,
  );
  const suggestionEligible = suggested?.dishes.some((placement) => {
    const candidate = state.dishes.find((item) => item.id === placement.dishId);
    return placement.availability === "available" && candidate?.dietTags.includes(diet);
  });
  return {
    ...extraction,
    recommendedAlternativeStationId: suggestionEligible
      ? suggested!.id
      : best?.id ?? null,
  };
}

function stripIncentives(extraction: Extraction): Extraction {
  const resemblesIncentive = /\b(free|discount|voucher|reward|coffee|dessert|points?)\b/i;
  return {
    ...extraction,
    recommendedAction: resemblesIncentive.test(extraction.recommendedAction)
      ? "Check station conditions and follow the event operations plan."
      : extraction.recommendedAction,
    guestAnnouncement: resemblesIncentive.test(extraction.guestAnnouncement)
      ? `${extraction.stationName} has an availability update.`
      : extraction.guestAnnouncement,
  };
}

export async function extractStaffUpdate(
  transcript: string,
  selectedStationId: string,
  state: BonaFlowState,
): Promise<Extraction> {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) throw new Error("NEBIUS_API_KEY is not configured.");
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.tokenfactory.nebius.com/v1/",
  });
  const stations = state.stations.map(({ id, name, dishes }) => ({
    id,
    name,
    dishes: dishes.map((placement) => {
      const dish = state.dishes.find((item) => item.id === placement.dishId)!;
      return { id: dish.id, name: dish.name };
    }),
  }));
  const completion = await client.chat.completions.create(
    {
      model: process.env.LM_MODEL || "Qwen/Qwen3-235B-A22B-Instruct-2507",
      messages: [
        {
          role: "system",
          content:
            "Extract only the human's operational report. Use only supplied ids. reportedGuestCount is null unless a number was spoken. Keep reportedFacts separate from aiInferences. Never create an incentive, reward, offer, discount, or free item.",
        },
        {
          role: "user",
          content: JSON.stringify({ selectedStationId, transcript, stations }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bonaflow_staff_update",
          strict: true,
          schema: extractionSchema,
        },
      },
    },
    { signal: AbortSignal.timeout(8000) },
  );
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Nebius returned an empty extraction.");
  const validated = validateExtraction(JSON.parse(content), state);
  if (validated.stationId !== selectedStationId) {
    throw new Error("Nebius returned a different stationId from the selected station.");
  }
  return enforceAlternative(state, stripIncentives(validated));
}
