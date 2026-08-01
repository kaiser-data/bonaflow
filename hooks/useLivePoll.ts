import { useEffect, useState } from 'react';

import { useBonaFlowStore } from '@/lib/store';

/** Shared cadence: backend poll and on-screen clock refresh. */
export const LIVE_POLL_MS = 3000;

export type LivePoll = {
  /** Store revision seen at the last poll. */
  revision: number;
  /** Increments on every poll, so ages and clocks stay current. */
  tick: number;
};

/**
 * Keeps a screen current without a refresh button.
 *
 * The shared state lives in the backend and is fetched every three seconds by
 * `lib/sync.ts`, which hydrates the store every screen reads; polling is the
 * deliberate choice over websockets because it recovers by itself on unreliable
 * conference wifi. This hook re-reads the store on the same cadence so relative
 * ages and timestamps stay current even when no data changed.
 */
export function useLivePoll(intervalMs: number = LIVE_POLL_MS): LivePoll {
  const [poll, setPoll] = useState<LivePoll>(() => ({
    revision: useBonaFlowStore.getState().revision,
    tick: 0,
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      const { revision } = useBonaFlowStore.getState();
      setPoll((previous) => ({ revision, tick: previous.tick + 1 }));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return poll;
}
