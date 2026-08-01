import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { ActivityRow } from '@/components/ops/ActivityRow';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useBonaFlowStore } from '@/lib/store';

/** Recent staff updates with their transcripts and timestamps, newest first. */
export default function OperationsActivityScreen() {
  const updates = useBonaFlowStore((state) => state.updates);
  const stations = useBonaFlowStore((state) => state.stations);
  const poll = useLivePoll();

  const ordered = useMemo(
    () => [...updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [updates, poll.revision],
  );

  return (
    <Screen scroll edges={['left', 'right']} contentClassName="gap-4 px-5 py-4">
      <View className="gap-1">
        <Text className="text-foreground text-lg font-semibold">
          {ordered.length === 0 ? 'No updates yet' : `${ordered.length} updates`}
        </Text>
        <MonoText className="text-muted text-[11px]">
          every confirmed report from every phone · newest first
        </MonoText>
      </View>

      {ordered.length === 0 ? (
        <Text className="text-muted text-base">
          Staff reports appear here as they are confirmed, with the words they arrived as.
        </Text>
      ) : (
        ordered.map((update) => <ActivityRow key={update.id} update={update} stations={stations} />)
      )}
    </Screen>
  );
}
