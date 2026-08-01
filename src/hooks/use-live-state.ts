"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BonaFlowState } from "@/domain/types";

export function useLiveState() {
  const [state, setState] = useState<BonaFlowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const poll = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await fetch("/api/state", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Live updates are temporarily delayed.");
      const nextState = (await response.json()) as BonaFlowState;
      if (!Array.isArray(nextState.stations)) throw new Error("Invalid state response.");
      setState(nextState);
      setStale(false);
      setError(null);
      setLastSuccessAt(new Date().toISOString());
    } catch (pollError) {
      if (controller.signal.aborted) return;
      setStale(true);
      setError(
        pollError instanceof Error
          ? pollError.message
          : "Live updates are temporarily delayed.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void poll();
    const interval = window.setInterval(() => void poll(), 3000);
    return () => {
      window.clearInterval(interval);
      controllerRef.current?.abort();
    };
  }, [poll]);

  return { state, loading, stale, error, lastSuccessAt };
}
