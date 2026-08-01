import { Platform, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

/**
 * A heading set in the house display face: heavy condensed uppercase, stacked on
 * tight lines.
 *
 * This is the typographic voice of the Bella&Bona design without shipping the
 * caterer's logo file. Set in type it stays sharp at every density, re-flows with
 * the content column (phone, 480pt desktop column, projector mirror) and renders
 * on the first frame with no image decode.
 */

/** Native family name registered by `useFonts` in app/_layout.tsx. */
const DISPLAY_FAMILY = 'Anton_400Regular';

/**
 * react-native-web writes a font family onto every text node, so the app typeface
 * is applied in CSS with a selector that outranks it (public/index.html).
 * `data-display` is how the display face opts out of that rule; web only.
 */
const WEB_DISPLAY_MARKER: { dataSet?: Record<string, string> } =
  Platform.OS === 'web' ? { dataSet: { display: 'true' } } : {};

/** Line height as a fraction of the type size — tight, as in the house design. */
const LINE_RATIO = 0.9;

/** Negative tracking, as a fraction of the type size. */
const TRACKING_RATIO = -0.015;

export type DisplayHeadingProps = {
  /** The stacked words. Rendered uppercase, one line each. */
  lines: readonly string[];
  /** Type size in points. Derive it from the column width, not from a constant. */
  size: number;
  /** Ink colour. Defaults to the primary text colour. */
  color?: string;
};

export function DisplayHeading({ lines, size, color = colors.foreground }: DisplayHeadingProps) {
  const lineStyle = {
    color,
    fontFamily: DISPLAY_FAMILY,
    fontSize: size,
    lineHeight: Math.round(size * LINE_RATIO),
    letterSpacing: Math.round(size * TRACKING_RATIO),
    // Anton has no bold cut; asking for one triggers a synthetic face on web.
    fontWeight: '400' as const,
  };

  return (
    <View accessible accessibilityRole="header" accessibilityLabel={lines.join(' ')}>
      {lines.map((line) => (
        <Text
          key={line}
          // The size is measured against the column, so a system text scale would
          // push the mark past the edge instead of re-flowing it.
          allowFontScaling={false}
          style={lineStyle}
          {...WEB_DISPLAY_MARKER}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {line.toUpperCase()}
        </Text>
      ))}
    </View>
  );
}
