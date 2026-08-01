import { Text, View } from 'react-native';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { shadow } from '@/lib/platform';
import { formatAge } from '@/lib/clock';
import type { ReplenishmentTask } from '@/lib/store';
import { actionLabel, priorityLabel } from '@/lib/stations';

export type TaskRowProps = {
  task: ReplenishmentTask;
  stationName: string;
  dishName: string | null;
  onComplete: (taskId: string) => void;
};

/** One open task. Tapping it marks it done. */
export function TaskRow({ task, stationName, dishName, onComplete }: TaskRowProps) {
  return (
    <Touchable
      accessibilityLabel={`Mark ${actionLabel(task.action)} at ${stationName} as done`}
      onPress={() => onComplete(task.id)}
      className="bg-surface border-border gap-3 rounded-3xl border p-5"
      style={shadow('sm')}
    >
      <View className="gap-1">
        <Text className="text-foreground text-lg font-semibold">{dishName ?? 'Whole station'}</Text>
        <Text className="text-muted text-base">{stationName}</Text>
      </View>

      <MonoText className="text-foreground text-xs">
        {actionLabel(task.action)} · priority: {priorityLabel(task.priority)} · age{' '}
        {formatAge(task.createdAt)}
      </MonoText>

      <Text className="text-muted text-sm">Tap to mark done</Text>
    </Touchable>
  );
}
