import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/lib/platform';
import { cn } from '@/lib/utils';

export type TouchableProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Classes for the inner content box. */
  className?: string;
  /** Classes applied while pressed. Defaults to a visible dim. */
  pressedClassName?: string;
  /** Scale applied while pressed. Set to 1 to disable. */
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

const HIT_SLOP = 8;

/**
 * Pressable with an explicit, identical pressed state on iOS and Android and a
 * guaranteed 44x44 minimum touch target. Platform default feedback differs
 * (iOS has none, Android ripple varies), so feedback is defined here.
 */
export function Touchable({
  children,
  className,
  pressedClassName = 'opacity-60',
  pressedScale = 0.98,
  style,
  accessibilityRole = 'button',
  ...rest
}: TouchableProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      hitSlop={HIT_SLOP}
      style={[{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }, style]}
      {...rest}
    >
      {({ pressed }) => (
        <View
          className={cn(
            'min-h-11 min-w-11 flex-1 justify-center',
            className,
            pressed && pressedClassName,
          )}
          style={pressed ? { transform: [{ scale: pressedScale }] } : undefined}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}
