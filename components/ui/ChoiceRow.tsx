import { Text, View } from 'react-native';

import { Touchable } from '@/components/ui/Touchable';
import { cn } from '@/lib/utils';

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

export type ChoiceRowProps<T extends string> = {
  /** Field name, e.g. "Availability". */
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  className?: string;
};

/**
 * Editable field rendered as wrapped chips. Selection is neutral dark: colour
 * only ever carries meaning in the station status dot.
 */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onSelect,
  className,
}: ChoiceRowProps<T>) {
  return (
    <View className={cn('gap-2', className)}>
      <Text className="text-muted text-xs font-semibold uppercase">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Touchable
              key={option.value}
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option.value)}
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
