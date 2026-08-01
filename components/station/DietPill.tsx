import { Text, View } from 'react-native';

import type { DietTag } from '@/lib/store';
import { dietTagLabel } from '@/lib/stations';

export type DietPillProps = { tag: DietTag };

/** Small neutral pill. Dietary tags never use the reserved status colours. */
export function DietPill({ tag }: DietPillProps) {
  return (
    <View className="bg-default border-border rounded-full border px-2.5 py-1">
      <Text className="text-muted text-xs font-medium">{dietTagLabel(tag)}</Text>
    </View>
  );
}
