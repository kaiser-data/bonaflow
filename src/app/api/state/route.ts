import { NextResponse } from "next/server";
import { getStateRepository } from "@/server/state-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getStateRepository().get();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("BonaFlow state read failed", error);
    return NextResponse.json(
      { error: "Shared state is temporarily unavailable." },
      { status: 503 },
    );
  }
}
