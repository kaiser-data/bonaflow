import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { buildOverrideDraft } from '@/lib/reports';
import { useBonaFlowStore } from '@/lib/store';
import { formatClock } from '@/lib/stations';

/**
 * Hidden demo override, reached by long-pressing the Report tab or its title.
 * It forces the scripted state change with no network at all: the seeded ids are
 * used directly and the write goes through the same store path as a confirmed
 * report, so the alert, the task and both other views follow.
 */
export default function StaffOverrideScreen() {
  const router = useRouter();
  const applyReport = useBonaFlowStore((state) => state.applyReport);
  const updates = useBonaFlowStore((state) => state.updates);
  const [appliedAt, setAppliedAt] = useState<string | null>(null);

  const force = () => {
    applyReport(buildOverrideDraft());
    const latest = useBonaFlowStore.getState().updates[0];
    setAppliedAt(latest.createdAt);
  };

  return (
    <Screen scroll contentClassName="gap-6 px-5 py-6">
      <View className="gap-2">
        <Text className="text-foreground text-2xl font-semibold">Demo override</Text>
        <Text className="text-muted text-base">
          Forces the scripted state change. Works with no network.
        </Text>
      </View>

      <Card level="sm" className="gap-2 rounded-3xl p-5">
        <MonoText className="text-foreground text-sm">Station: Counter B</MonoText>
        <MonoText className="text-foreground text-sm">Dish: Thai Peanut Bowl</MonoText>
        <MonoText className="text-foreground text-sm">Availability: sold out</MonoText>
        <MonoText className="text-foreground text-sm">Queue: high</MonoText>
        <MonoText className="text-foreground text-sm">Guests waiting: 20 (reported)</MonoText>
        <MonoText className="text-foreground text-sm">Action: replenish — priority high</MonoText>
        <MonoText className="text-muted text-xs">
          station turns red · alert and task created
        </MonoText>
      </Card>

      {appliedAt === null ? null : (
        <Card level="sm" className="gap-1 rounded-3xl p-5">
          <MonoText className="text-muted text-xs">applied {formatClock(appliedAt)}</MonoText>
          <Text className="text-foreground text-base">
            Counter B is now sold out of the Thai Peanut Bowl. Guest and operations views have
            already changed.
          </Text>
          <MonoText className="text-muted text-xs">{updates.length} updates recorded</MonoText>
        </Card>
      )}

      <View className="gap-3">
        <Touchable
          accessibilityLabel="Force the scripted change"
          onPress={force}
          style={{ minHeight: 64 }}
          className="bg-accent items-center justify-center rounded-3xl px-5"
        >
          <Text className="text-accent-foreground text-lg font-semibold">
            Force scripted change
          </Text>
        </Touchable>

        <Touchable
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={{ minHeight: 60 }}
          className="bg-surface border-border items-center justify-center rounded-3xl border px-5"
        >
          <Text className="text-foreground text-lg font-semibold">Close</Text>
        </Touchable>
      </View>
    </Screen>
  );
}
