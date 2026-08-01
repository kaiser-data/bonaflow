import { useEffect, useState } from 'react';

import { useBonaFlowStore } from '@/lib/store';

/** Documented fallback interval when no real-time transport is available. */
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
 * The shared store pushes changes to every subscribed screen, so a staff report
 * reaches the guest view immediately. Real-time sync across devices is not
 * available in this prototype, so this hook re-reads the shared store every
 * three seconds as the documented fallback; the returned values also make
 * relative ages and timestamps re-render on the same cadence.
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
