import { describe, expect, it } from "vitest";
import {
  appendFeedback,
  formatFeedbackSummary,
  interpretFeedbackKeywords,
  validateDishRating,
  validateFeedbackExplanation,
} from "./feedback";
import {
  buildDemoVoucher,
  loadStoredVoucher,
  storeVoucher,
  voucherStorageKey,
} from "./rewards";
import { SEED_STATE } from "./seed";
import type { FeedbackExtraction } from "./types";

const extraction = {
  dishId: "vegan-chickpeas-quinoa-salad",
  leftoverAmount: "most",
  reason: "portion_too_large",
  reportedFacts: ["Most was left because the portion was too large."],
  aiInferences: [],
  confidence: 0.96,
} satisfies FeedbackExtraction;

describe("rated feedback", () => {
  it("accepts only integer ratings from one through five", () => {
    expect(validateDishRating(1)).toBe(1);
    expect(validateDishRating(5)).toBe(5);
    for (const value of [0, 6, 2.5, "5", null]) {
      expect(() => validateDishRating(value)).toThrow(/rating/i);
    }
  });

  it("requires at least five trimmed explanation characters", () => {
    expect(validateFeedbackExplanation("  bland  ")).toBe("bland");
    expect(() => validateFeedbackExplanation("bad")).toThrow(/explanation/i);
  });

  it("stores the direct rating and changes only feedback", () => {
    const next = appendFeedback(
      SEED_STATE,
      extraction,
      4,
      extraction.reportedFacts[0],
      "feedback-1",
      "2026-08-02T12:00:00.000Z",
    );
    const { feedback: beforeFeedback, ...beforeOps } = SEED_STATE;
    const { feedback: afterFeedback, ...afterOps } = next;
    expect(beforeFeedback).toHaveLength(0);
    expect(afterFeedback[0]).toMatchObject({ rating: 4, id: "feedback-1" });
    expect(afterOps).toEqual(beforeOps);
  });

  it("reads as a sentence for every leftover amount", () => {
    const summaries = (["none", "some", "most", "unknown"] as const).map(
      (leftoverAmount) =>
        formatFeedbackSummary({ ...extraction, leftoverAmount }, SEED_STATE),
    );
    expect(summaries).toEqual([
      "Nothing was left of the Vegan Chickpeas Quinoa Salad — portion too large",
      "Some was left of the Vegan Chickpeas Quinoa Salad — portion too large",
      "Most was left of the Vegan Chickpeas Quinoa Salad — portion too large",
      "An unknown amount was left of the Vegan Chickpeas Quinoa Salad — portion too large",
    ]);
  });

  it("falls back to keywords in English and German", () => {
    const read = (text: string) =>
      interpretFeedbackKeywords(text, extraction.dishId, SEED_STATE);

    expect(read("Most of it was left, the portion was too large")).toMatchObject({
      leftoverAmount: "most",
      reason: "portion_too_large",
    });
    expect(read("Die Portion war viel zu gross, ich habe die Haelfte stehen lassen")).toMatchObject({
      leftoverAmount: "some",
      reason: "portion_too_large",
    });
    expect(read("I finished it, it was great")).toMatchObject({
      leftoverAmount: "none",
    });
    // Nothing recognised must stay honest rather than guess.
    expect(read("hmm ok")).toMatchObject({
      leftoverAmount: "unknown",
      reason: "other",
    });
  });

  it("builds and restores the event-scoped fixed demo voucher", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    const voucher = buildDemoVoucher("live");
    expect(voucher).toEqual({
      eventId: "live",
      title: "Free coffee on the Terrace",
      code: "BONAFLOW-DEMO",
      terms: "One demo voucher per browser · Hackathon prototype",
    });
    expect(voucherStorageKey("live")).toBe("bonaflow:voucher:live");
    expect(storeVoucher(storage, voucher)).toBe(true);
    expect(loadStoredVoucher(storage, "live")).toEqual(voucher);
    expect(loadStoredVoucher(storage, "another-event")).toBeNull();
  });

  it("survives unavailable or malformed browser storage", () => {
    const failing = {
      getItem: () => "not-json",
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const voucher = buildDemoVoucher("live");
    expect(loadStoredVoucher(failing, "live")).toBeNull();
    expect(storeVoucher(failing, voucher)).toBe(false);
  });
});
