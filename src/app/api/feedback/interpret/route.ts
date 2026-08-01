import { NextResponse } from "next/server";
import {
  formatFeedbackSummary,
  interpretFeedbackKeywords,
} from "@/domain/feedback";
import { getStateRepository } from "@/server/state-repository";
import { extractFeedback } from "@/server/nebius-feedback";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { selectedDishId?: string; text?: string };
    if (!body.selectedDishId || !body.text?.trim()) {
      return NextResponse.json(
        { error: "Select a dish and share what was left." },
        { status: 400 },
      );
    }
    const state = await getStateRepository().get();
    try {
      const extraction = await extractFeedback(body.text, body.selectedDishId, state);
      return NextResponse.json({
        extraction,
        summary: formatFeedbackSummary(extraction, state),
        interpretationMode: "nebius",
      });
    } catch (error) {
      console.warn("BonaFlow feedback fallback", error);
      const extraction = interpretFeedbackKeywords(body.text, body.selectedDishId, state);
      return NextResponse.json({
        extraction,
        summary: formatFeedbackSummary(extraction, state),
        interpretationMode: "offline",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback could not be interpreted.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
