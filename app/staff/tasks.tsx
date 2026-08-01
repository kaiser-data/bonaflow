import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { TaskRow } from '@/components/staff/TaskRow';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { findDish, findStation, useBonaFlowStore, type ReplenishmentTask } from '@/lib/store';

/** Open replenishment tasks, newest first. Tapping one marks it done. */
export default function StaffTasksScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const tasks = useBonaFlowStore((state) => state.tasks);
  const completeTask = useBonaFlowStore((state) => state.completeTask);
  const poll = useLivePoll();

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === 'open'),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [tasks, poll.revision],
  );

  const doneCount = tasks.length - openTasks.length;

  return (
    <Screen edges={['left', 'right']}>
      <FlatList<ReplenishmentTask>
        className="flex-1"
        data={openTasks}
        keyExtractor={(task) => task.id}
        // `poll.tick` re-renders the rows so the age on each task stays current.
        extraData={poll.tick}
        renderItem={({ item }) => {
          const station = findStation(stations, item.stationId);
          const dish = findDish(station, item.dishId);

          return (
            <View className="px-5">
              <TaskRow
                task={item}
                stationName={station?.name ?? 'Unknown station'}
                dishName={dish?.name ?? null}
                onComplete={completeTask}
              />
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-1 px-5 pb-5">
            <Text className="text-foreground text-2xl font-semibold">Open tasks</Text>
            <MonoText className="text-muted text-xs">
              {openTasks.length} open · {doneCount} done
            </MonoText>
          </View>
        }
        ListEmptyComponent={
          <View className="px-5 py-8">
            <Text className="text-foreground text-lg font-medium">No open tasks.</Text>
          </View>
        }
      />
    </Screen>
  );
}
