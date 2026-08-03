import "server-only";
import OpenAI from "openai";
import type { BonaFlowState, FeedbackExtraction } from "@/domain/types";
import { validateFeedbackExtraction } from "@/domain/feedback";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    dishId: { type: "string" },
    leftoverAmount: { enum: ["none", "some", "most", "unknown"] },
    reason: { enum: ["portion_too_large", "not_tasty", "dietary_mismatch", "other", "unknown"] },
    reportedFacts: { type: "array", items: { type: "string" } },
    aiInferences: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["dishId", "leftoverAmount", "reason", "reportedFacts", "aiInferences", "confidence"],
} as const;

export async function extractFeedback(
  text: string,
  selectedDishId: string,
  state: BonaFlowState,
): Promise<FeedbackExtraction> {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) throw new Error("NEBIUS_API_KEY is not configured.");
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.tokenfactory.nebius.com/v1/",
  });
  const response = await client.chat.completions.create(
    {
      model: process.env.LM_MODEL || "Qwen/Qwen3-235B-A22B-Instruct-2507",
      messages: [
        {
          role: "system",
          content: [
            "Extract anonymous leftover feedback from a catering guest.",
            "The transcript may be German or English.",
            "leftoverAmount is how much food the guest LEFT UNEATEN:",
            '"none" = the guest ate everything;',
            '"some" = a part was left, including about half;',
            '"most" = nearly all of it was left;',
            '"unknown" = the guest did not say.',
            "reportedFacts contain only what the guest said; aiInferences contain conclusions.",
            "Do not produce a rating, score, reward, voucher, or operational update.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            selectedDishId,
            transcript: text,
            dishes: state.dishes.map(({ id, name }) => ({ id, name })),
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "bonaflow_leftover_feedback", strict: true, schema },
      },
    },
    { signal: AbortSignal.timeout(8000) },
  );
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Nebius returned empty feedback.");
  const extraction = validateFeedbackExtraction(JSON.parse(content), state);
  if (extraction.dishId !== selectedDishId) {
    throw new Error("Nebius returned a different dishId from the selected dish.");
  }
  return extraction;
}
