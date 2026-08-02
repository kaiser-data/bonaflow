import { describe, expect, it } from "vitest";
import { SEED_STATE } from "../domain/seed";
import type { BonaFlowState, FeedbackExtraction } from "../domain/types";
import { submitRatedFeedback } from "./feedback-service";

const extraction = {
  dishId: "vegan-chickpeas-quinoa-salad",
  leftoverAmount: "most",
  reason: "portion_too_large",
  reportedFacts: ["Most was left because the portion was too large."],
  aiInferences: [],
  confidence: 0.96,
} satisfies FeedbackExtraction;

const input = {
  extraction,
  rating: 4,
  transcript: "Most was left because the portion was too large.",
};
const now = "2026-08-02T12:00:00.000Z";

class TestRepository {
  state = structuredClone(SEED_STATE);
  replaced: BonaFlowState | null = null;

  async get() {
    return structuredClone(this.state);
  }

  async replace(state: BonaFlowState) {
    this.replaced = structuredClone(state);
    this.state = structuredClone(state);
    return structuredClone(state);
  }
}

class FailingRepository extends TestRepository {
  async replace(_state: BonaFlowState): Promise<BonaFlowState> {
    throw new Error("write failed");
  }
}

describe("submitRatedFeedback", () => {
  it("returns the demo voucher only after persisting rated feedback", async () => {
    const repository = new TestRepository();

    const result = await submitRatedFeedback(
      repository,
      input,
      "feedback-1",
      now,
    );

    expect(result).toEqual({
      feedbackCount: 1,
      voucher: {
        eventId: "live",
        title: "Free coffee on the Terrace",
        code: "BONAFLOW-DEMO",
        terms: "One demo voucher per browser · Hackathon prototype",
      },
    });
    expect(repository.replaced?.feedback[0]).toMatchObject({
      id: "feedback-1",
      rating: 4,
    });
  });

  it("rejects an invalid rating without persisting", async () => {
    const repository = new TestRepository();

    await expect(
      submitRatedFeedback(
        repository,
        { ...input, rating: 0 },
        "feedback-1",
        now,
      ),
    ).rejects.toThrow(/rating/i);
    expect(repository.replaced).toBeNull();
  });

  it("returns no voucher result when persistence fails", async () => {
    const repository = new FailingRepository();

    await expect(
      submitRatedFeedback(repository, input, "feedback-1", now),
    ).rejects.toThrow("write failed");
    expect(repository.replaced).toBeNull();
  });
});
