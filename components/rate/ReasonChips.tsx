import { Text, View } from 'react-native';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { REASON_OPTIONS, reasonLabel } from '@/lib/ratings';
import type { LeftoverReason } from '@/lib/store';
import { cn } from '@/lib/utils';

export type ReasonChipsProps = {
  /** Reasons currently on the review. */
  value: readonly LeftoverReason[];
  onChange: (value: readonly LeftoverReason[]) => void;
  /**
   * Reasons the reading service suggested but the guest never said. Rendered
   * apart from the rest and only added when the guest taps one.
   */
  suggested?: readonly LeftoverReason[];
  label?: string;
};

/**
 * Why food was left. Multi-select, because a bowl usually comes back for more
 * than one reason, and a closed list, because reasons only help a kitchen once
 * they can be counted.
 */
export function ReasonChips({
  value,
  onChange,
  suggested = [],
  label = 'Why? (as many as apply)',
}: ReasonChipsProps) {
  const toggle = (reason: LeftoverReason) => {
    onChange(
      value.includes(reason) ? value.filter((entry) => entry !== reason) : [...value, reason],
    );
  };

  const openSuggestions = suggested.filter((reason) => !value.includes(reason));

  return (
    <View className="gap-3">
      <View className="gap-2">
        <Text className="text-muted text-xs font-semibold uppercase">{label}</Text>

        <View className="flex-row flex-wrap gap-2">
          {REASON_OPTIONS.map((option) => {
            const active = value.includes(option.value);
            return (
              <Touchable
                key={option.value}
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                onPress={() => toggle(option.value)}
                className={cn(
                  'flex-none items-center justify-center rounded-full px-4',
                  active ? 'bg-foreground' : 'bg-surface border-border border',
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
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

      {openSuggestions.length === 0 ? null : (
        <View className="border-border gap-2 rounded-2xl border border-dashed p-3">
          <MonoText className="text-muted text-[11px]">worked out, not said — tap to add</MonoText>
          <View className="flex-row flex-wrap gap-2">
            {openSuggestions.map((reason) => (
              <Touchable
                key={reason}
                accessibilityLabel={`Add ${reasonLabel(reason)}`}
                onPress={() => toggle(reason)}
                className="border-border bg-background flex-none items-center justify-center rounded-full border px-4"
              >
                <Text className="text-foreground text-sm font-medium">+ {reasonLabel(reason)}</Text>
              </Touchable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
