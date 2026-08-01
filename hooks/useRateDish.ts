import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useBonaFlowStore } from '@/lib/store';

/**
 * Start a review from wherever the guest is looking at the bowl.
 *
 * A guest who has just eaten recognises their bowl on the stations list; asking
 * them to remember its name, change tab and find it a second time is the slowest
 * part of the old flow. Tapping the bowl records which one it was and opens the
 * Rate tab already on it, so the microphone is the first thing on screen.
 */
export function useRateDish(): (stationId: string, dishId: string) => void {
  const router = useRouter();
  const setRatingTarget = useBonaFlowStore((state) => state.setRatingTarget);

  return useCallback(
    (stationId: string, dishId: string) => {
      setRatingTarget(stationId, dishId);
      router.push('/rate');
    },
    [router, setRatingTarget],
  );
}
