import { NextResponse } from "next/server";
import { resetState } from "@/domain/mutations";
import { getStateRepository } from "@/server/state-repository";

export const runtime = "nodejs";

export async function POST() {
  try {
    const state = await getStateRepository().replace(resetState());
    return NextResponse.json(state);
  } catch (error) {
    console.error("BonaFlow reset failed", error);
    return NextResponse.json(
      { error: "Demo state could not be reset." },
      { status: 503 },
    );
  }
}
