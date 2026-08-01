import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { StationCard } from '@/components/station/StationCard';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { eventNow, toLocalIso } from '@/lib/clock';
import { useBonaFlowStore, type Station } from '@/lib/store';
import { formatClock } from '@/lib/stations';

/** Staff board: the same station picture the guests see, refreshing on its own. */
export default function StaffStationsScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const tasks = useBonaFlowStore((state) => state.tasks);
  const event = useBonaFlowStore((state) => state.event);
  const poll = useLivePoll();

  const openTaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (task.status !== 'open') continue;
      counts.set(task.stationId, (counts.get(task.stationId) ?? 0) + 1);
    }
    return counts;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
  }, [tasks, poll.revision]);

  const clock = formatClock(toLocalIso(eventNow()));

  return (
    <Screen edges={['left', 'right']}>
      <FlatList<Station>
        className="flex-1"
        data={stations}
        keyExtractor={(station) => station.id}
        renderItem={({ item }) => {
          const openCount = openTaskCounts.get(item.id) ?? 0;

          return (
            <View className="gap-2 px-5">
              <StationCard station={item} />
              {openCount > 0 ? (
                <MonoText className="text-muted px-1 text-xs">
                  {openCount} open task{openCount === 1 ? '' : 's'}
                </MonoText>
              ) : null}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-1 px-5 pb-5">
            <Text className="text-foreground text-2xl font-semibold">{event.name}</Text>
            <MonoText className="text-muted text-xs">
              live board · {clock} · updates on its own
            </MonoText>
          </View>
        }
      />
    </Screen>
  );
}
