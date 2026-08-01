import { NextResponse } from "next/server";
import { applyExtraction } from "@/domain/mutations";
import { getStateRepository } from "@/server/state-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { extraction?: unknown };
    if (!body.extraction) {
      return NextResponse.json(
        { ok: false, error: "An extraction is required." },
        { status: 400 },
      );
    }
    const repository = getStateRepository();
    const current = await repository.get();
    const state = applyExtraction(
      current,
      body.extraction,
      new Date().toISOString(),
    );
    await repository.replace(state);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid update.";
    const isValidationError =
      message.includes("station") ||
      message.includes("dish") ||
      message.includes("Invalid") ||
      message.includes("Expected") ||
      message.includes("Required");
    if (isValidationError) {
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
    console.error("BonaFlow apply failed", error);
    return NextResponse.json(
      { ok: false, error: "Shared state could not be updated." },
      { status: 503 },
    );
  }
}
