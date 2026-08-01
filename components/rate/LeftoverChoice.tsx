import { Text, View } from 'react-native';

import { Touchable } from '@/components/ui/Touchable';
import { LEFTOVER_OPTIONS } from '@/lib/ratings';
import type { LeftoverAmount } from '@/lib/store';
import { cn } from '@/lib/utils';

export type LeftoverChoiceProps = {
  value: LeftoverAmount | null;
  onChange: (value: LeftoverAmount | null) => void;
  label?: string;
};

/**
 * How much came back. This is the number the kitchen cannot get any other way:
 * a bin tells them the total, and only a guest can say which bowl it came from.
 *
 * Null stays selectable by tapping the same answer again, because "I would rather
 * not say" has to be possible or the answers stop being true.
 */
export function LeftoverChoice({
  value,
  onChange,
  label = 'How much was left?',
}: LeftoverChoiceProps) {
  return (
    <View className="gap-2">
      <Text className="text-muted text-xs font-semibold uppercase">{label}</Text>

      <View className="flex-row flex-wrap gap-2">
        {LEFTOVER_OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <Touchable
              key={option.value}
              accessibilityLabel={option.label}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(active ? null : option.value)}
              className={cn(
                'flex-none items-center justify-center rounded-full px-4',
                active ? 'bg-foreground' : 'bg-surface border-border border',
              )}
            >
              <Text
                className={cn(
                  'text-base',
                  active ? 'text-background font-semibold' : 'text-foreground font-medium',
                )}
              >
                {option.label}
              </Text>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}
