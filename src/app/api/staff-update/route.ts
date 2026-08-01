import { NextResponse } from "next/server";
import {
  interpretKeywords,
  quickActionExtraction,
  type QuickAction,
} from "@/domain/interpretation";
import { getStateRepository } from "@/server/state-repository";
import { extractStaffUpdate } from "@/server/nebius";

export const runtime = "nodejs";

type StaffUpdateBody = {
  stationId?: string;
  transcript?: string;
  quickAction?: QuickAction;
  dishId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StaffUpdateBody;
    if (!body.stationId) {
      return NextResponse.json(
        { error: "Select a station first." },
        { status: 400 },
      );
    }
    const state = await getStateRepository().get();
    if (body.quickAction) {
      return NextResponse.json({
        extraction: quickActionExtraction(
          body.quickAction,
          body.stationId,
          body.dishId,
          state,
        ),
        interpretationMode: "quick_action",
      });
    }
    if (!body.transcript?.trim()) {
      return NextResponse.json(
        { error: "Enter or record an update." },
        { status: 400 },
      );
    }
    try {
      return NextResponse.json({
        extraction: await extractStaffUpdate(body.transcript, body.stationId, state),
        interpretationMode: "nebius",
      });
    } catch (error) {
      console.warn("BonaFlow Nebius fallback", error);
      return NextResponse.json({
        extraction: interpretKeywords(body.transcript, body.stationId, state),
        interpretationMode: "offline",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update could not be interpreted.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
