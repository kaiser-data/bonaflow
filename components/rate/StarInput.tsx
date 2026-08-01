import { Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { colors } from '@/lib/theme';

export type StarInputProps = {
  /** 1 to 5, or null when nobody has given a score. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Said out loud by the guest rather than tapped. */
  reported?: boolean;
};

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * The score, 1 to 5.
 *
 * Null is a real state and stays visible: "not scored" is honest, and a review
 * that only says why food was left is still worth storing. Tapping the same star
 * again clears it, so a guest can take a score back.
 */
export function StarInput({ value, onChange, reported = false }: StarInputProps) {
  return (
    <View className="gap-2">
      <Text className="text-muted text-xs font-semibold uppercase">How was it?</Text>

      <View className="flex-row items-center gap-1">
        {SCORES.map((score) => {
          const filled = value !== null && score <= value;
          return (
            <Touchable
              key={score}
              accessibilityLabel={`${score} of 5`}
              accessibilityState={{ selected: filled }}
              onPress={() => onChange(value === score ? null : score)}
              className="flex-none items-center justify-center rounded-2xl px-1.5"
            >
              <Star
                size={34}
                color={filled ? colors.foreground : colors.muted}
                fill={filled ? colors.foreground : 'transparent'}
              />
            </Touchable>
          );
        })}
      </View>

      <MonoText className="text-muted text-[11px]">
        {value === null
          ? 'not scored — you can leave this empty'
          : reported
            ? `${value} of 5 · you said this`
            : `${value} of 5`}
      </MonoText>
    </View>
  );
}
