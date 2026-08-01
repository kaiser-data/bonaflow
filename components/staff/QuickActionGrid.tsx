import { Text, View } from 'react-native';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { shadow } from '@/lib/platform';
import { QUICK_ACTIONS, type QuickAction } from '@/lib/reports';

export type QuickActionGridProps = {
  onSelect: (quickAction: QuickAction) => void;
};

/**
 * Six one-tap reports. They work with no model and no network: each button
 * carries a fixed set of field values defined in `lib/reports.ts`.
 */
export function QuickActionGrid({ onSelect }: QuickActionGridProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {QUICK_ACTIONS.map((quickAction) => (
        <Touchable
          key={quickAction.id}
          accessibilityLabel={quickAction.label}
          onPress={() => onSelect(quickAction)}
          style={[{ width: '48%', minHeight: 92 }, shadow('sm')]}
          className="bg-surface border-border justify-between rounded-3xl border p-4"
        >
          <Text className="text-foreground text-base font-semibold">{quickAction.label}</Text>
          <MonoText className="text-muted text-[11px]">
            {quickAction.scope === 'dish' ? 'pick a dish' : 'whole station'}
          </MonoText>
        </Touchable>
      ))}
    </View>
  );
}
