import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/lib/theme';

/**
 * Monospace family that actually resolves on both platforms.
 * iOS has no font called "monospace"; Android has no "Menlo".
 */
export const monoFontFamily =
  Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }) ?? 'monospace';

export const monoTextStyle: TextStyle = { fontFamily: monoFontFamily };

/** Keyboard avoidance behavior per platform. */
export const keyboardBehavior = Platform.OS === 'ios' ? ('padding' as const) : ('height' as const);

/** Minimum accessible touch target, in points. */
export const MIN_TOUCH_TARGET = 44;

export type ShadowLevel = 'sm' | 'md' | 'lg';

const SHADOW_TOKENS: Record<
  ShadowLevel,
  { offsetY: number; opacity: number; radius: number; elevation: number; webBlur: number }
> = {
  sm: { offsetY: 1, opacity: 0.06, radius: 3, elevation: 1, webBlur: 4 },
  md: { offsetY: 3, opacity: 0.1, radius: 8, elevation: 3, webBlur: 12 },
  lg: { offsetY: 8, opacity: 0.14, radius: 18, elevation: 8, webBlur: 26 },
};

/**
 * Elevation that renders on iOS *and* Android.
 * iOS reads shadowColor/Offset/Opacity/Radius; Android reads elevation only.
 * Both are returned so a card never looks flat on one platform.
 */
export function shadow(level: ShadowLevel = 'md'): ViewStyle {
  const token = SHADOW_TOKENS[level];

  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: token.offsetY },
        shadowOpacity: token.opacity,
        shadowRadius: token.radius,
      },
      android: {
        elevation: token.elevation,
        shadowColor: colors.shadow,
      },
      default: {
        boxShadow: `0px ${token.offsetY}px ${token.webBlur}px rgba(58, 42, 24, ${token.opacity})`,
      },
    }) ?? {}
  );
}
