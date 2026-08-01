import { NextResponse } from "next/server";
import { completeTask, setIncentiveActive } from "@/domain/operations";
import { getStateRepository } from "@/server/state-repository";

export const runtime = "nodejs";

type OpsBody =
  | { action: "complete_task"; taskId: string }
  | { action: "set_incentive"; active: boolean };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpsBody;
    const repository = getStateRepository();
    const current = await repository.get();
    const state =
      body.action === "complete_task"
        ? completeTask(current, body.taskId, new Date().toISOString())
        : body.action === "set_incentive"
          ? setIncentiveActive(current, body.active)
          : null;
    if (!state) {
      return NextResponse.json({ error: "Unknown operations action." }, { status: 400 });
    }
    await repository.replace(state);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operations update failed.";
    const status = message.includes("not found") ? 400 : 503;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
