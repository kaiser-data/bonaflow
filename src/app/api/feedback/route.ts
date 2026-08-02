import { NextResponse } from "next/server";
import { submitRatedFeedback } from "@/server/feedback-service";
import { getStateRepository } from "@/server/state-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      extraction?: unknown;
      transcript?: unknown;
      rating?: unknown;
    };
    const result = await submitRatedFeedback(
      getStateRepository(),
      body,
      `feedback-${crypto.randomUUID()}`,
      new Date().toISOString(),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback could not be saved.";
    const status = message.includes("Supabase") ? 503 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
