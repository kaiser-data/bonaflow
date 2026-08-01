import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { shadow, type ShadowLevel } from '@/lib/platform';
import { cn } from '@/lib/utils';

export type CardProps = {
  children: ReactNode;
  /** Elevation strength. Applies iOS shadow props and Android elevation. */
  level?: ShadowLevel;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Elevated surface. Never style a card with only iOS shadow props: `shadow()`
 * returns shadowColor/Offset/Opacity/Radius on iOS and elevation on Android so
 * the card reads the same on both platforms.
 */
export function Card({ children, level = 'md', className, style }: CardProps) {
  return (
    <View
      className={cn('bg-surface border-border rounded-2xl border p-4', className)}
      style={[shadow(level), style]}
    >
      {children}
    </View>
  );
}
