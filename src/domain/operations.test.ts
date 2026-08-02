import { describe, expect, it } from "vitest";
import { feedbackSummary } from "./operations";
import { SEED_STATE } from "./seed";
import type { FeedbackRecord } from "./types";

const baseRecord = {
  dishId: "vegan-chickpeas-quinoa-salad",
  reportedFacts: ["Guest feedback."],
  aiInferences: [],
  confidence: 0.9,
  createdAt: "2026-08-02T12:00:00.000Z",
};

describe("feedbackSummary", () => {
  it("combines rating analytics with legacy leftover and reason signals", () => {
    const state = structuredClone(SEED_STATE);
    state.feedback = [
      {
        ...baseRecord,
        id: "feedback-1",
        rating: 5,
        leftoverAmount: "none",
        reason: "other",
        transcript: "Loved the flavour.",
      },
      {
        ...baseRecord,
        id: "feedback-2",
        rating: 3,
        leftoverAmount: "some",
        reason: "portion_too_large",
        transcript: "The serving was too large.",
      },
      {
        ...baseRecord,
        id: "legacy-feedback",
        leftoverAmount: "most",
        reason: "not_tasty",
        transcript: "",
      },
    ] satisfies FeedbackRecord[];

    expect(feedbackSummary(state)).toEqual({
      total: 3,
      ratedTotal: 2,
      averageRating: 4,
      ratings: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
      voiceResponses: 2,
      leftovers: { none: 1, some: 1, most: 1, unknown: 0 },
      reasons: {
        portion_too_large: 1,
        not_tasty: 1,
        dietary_mismatch: 0,
        other: 1,
        unknown: 0,
      },
    });
  });

  it("uses a null average when no valid ratings exist", () => {
    const state = structuredClone(SEED_STATE);
    state.feedback = [
      {
        ...baseRecord,
        id: "legacy-feedback",
        leftoverAmount: "unknown",
        reason: "unknown",
        transcript: "Still useful context.",
      },
    ] satisfies FeedbackRecord[];

    expect(feedbackSummary(state)).toMatchObject({
      ratedTotal: 0,
      averageRating: null,
      ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      voiceResponses: 1,
    });
  });
});
