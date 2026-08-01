import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { AlertCard } from '@/components/ops/AlertCard';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useBonaFlowStore } from '@/lib/store';

/**
 * Active alerts, newest first. Each one carries its priority, its message and the
 * action it recommends, plus what was reported and what was inferred as two
 * separate blocks that never merge.
 */
export default function OperationsAlertsScreen() {
  const alerts = useBonaFlowStore((state) => state.alerts);
  const updates = useBonaFlowStore((state) => state.updates);
  const stations = useBonaFlowStore((state) => state.stations);
  const event = useBonaFlowStore((state) => state.event);
  const poll = useLivePoll();

  const ordered = useMemo(
    () => [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [alerts, poll.revision],
  );

  return (
    <Screen scroll edges={['left', 'right']} contentClassName="gap-4 px-5 py-4">
      <View className="gap-1">
        <Text className="text-foreground text-lg font-semibold">
          {ordered.length === 0 ? 'No alerts' : `${ordered.length} alerts`}
        </Text>
        <MonoText className="text-muted text-[11px]">newest first · refreshes every 3 s</MonoText>
      </View>

      {ordered.length === 0 ? (
        <Text className="text-muted text-base">
          Nothing has been reported yet. Alerts appear here the moment a staff member confirms an
          update, on any phone.
        </Text>
      ) : (
        ordered.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            update={updates.find((entry) => entry.id === alert.updateId) ?? null}
            stations={stations}
            incentive={event.incentive}
          />
        ))
      )}
    </Screen>
  );
}
