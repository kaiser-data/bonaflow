import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SEED_STATE } from "@/domain/seed";
import type { BonaFlowState } from "@/domain/types";

export interface StateRepository {
  get(): Promise<BonaFlowState>;
  replace(state: BonaFlowState): Promise<BonaFlowState>;
}

const memoryGlobal = globalThis as typeof globalThis & {
  bonaflowMemoryState?: BonaFlowState;
  bonaflowMemoryWarningShown?: boolean;
};

class MemoryStateRepository implements StateRepository {
  constructor() {
    if (!memoryGlobal.bonaflowMemoryState) {
      memoryGlobal.bonaflowMemoryState = structuredClone(SEED_STATE);
    }
    if (!memoryGlobal.bonaflowMemoryWarningShown) {
      console.warn(
        "BonaFlow: Supabase env vars missing; using non-durable in-memory state that may reset between serverless invocations.",
      );
      memoryGlobal.bonaflowMemoryWarningShown = true;
    }
  }

  async get(): Promise<BonaFlowState> {
    return structuredClone(memoryGlobal.bonaflowMemoryState ?? SEED_STATE);
  }

  async replace(state: BonaFlowState): Promise<BonaFlowState> {
    memoryGlobal.bonaflowMemoryState = structuredClone(state);
    return structuredClone(state);
  }
}

class SupabaseStateRepository implements StateRepository {
  private readonly client;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async get(): Promise<BonaFlowState> {
    const { data, error } = await this.client
      .from("bonaflow_state")
      .select("state")
      .eq("id", "live")
      .maybeSingle();

    if (error) throw new Error(`Supabase state read failed: ${error.message}`);
    if (!data) return this.replace(structuredClone(SEED_STATE));
    return data.state as BonaFlowState;
  }

  async replace(state: BonaFlowState): Promise<BonaFlowState> {
    const { error } = await this.client.from("bonaflow_state").upsert({
      id: "live",
      state,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Supabase state write failed: ${error.message}`);
    return structuredClone(state);
  }
}

let repository: StateRepository | undefined;

export function getStateRepository(): StateRepository {
  if (repository) return repository;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  repository =
    url && serviceRoleKey
      ? new SupabaseStateRepository(url, serviceRoleKey)
      : new MemoryStateRepository();
  return repository;
}
