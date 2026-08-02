import { NextResponse } from "next/server";
import {
  appendFeedback,
  validateDishRating,
  validateFeedbackExplanation,
  validateFeedbackExtraction,
} from "@/domain/feedback";
import { getStateRepository } from "@/server/state-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      extraction?: unknown;
      transcript?: unknown;
      rating?: unknown;
    };
    const repository = getStateRepository();
    const current = await repository.get();
    const extraction = validateFeedbackExtraction(body.extraction, current);
    const rating = validateDishRating(body.rating);
    const transcript = validateFeedbackExplanation(body.transcript);
    const next = appendFeedback(
      current,
      extraction,
      rating,
      transcript,
      `feedback-${crypto.randomUUID()}`,
      new Date().toISOString(),
    );
    const { feedback: currentFeedback, ...currentOperational } = current;
    const { feedback: nextFeedback, ...nextOperational } = next;
    if (JSON.stringify(currentOperational) !== JSON.stringify(nextOperational)) {
      throw new Error("Feedback isolation check failed.");
    }
    await repository.replace(next);
    return NextResponse.json({ ok: true, feedbackCount: nextFeedback.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback could not be saved.";
    const status = message.includes("Supabase") ? 503 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
