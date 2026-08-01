import { Platform, Text, View } from 'react-native';

import { brand } from '@/lib/theme';

/**
 * The Bella&Bona lockup, drawn in type rather than shipped as an image.
 *
 * The house design is one idea: a flat pink field carrying a heavy condensed
 * uppercase wordmark in the dark house green, set on two tight lines. Recreating
 * it in text keeps it sharp at every density, lets it re-flow with the content
 * column (phone, 480pt desktop column, projector mirror) and keeps the product
 * name in the mark instead of the caterer's own logo file.
 *
 * Geometry is derived from the panel width so the proportions of the original
 * lockup hold at any size: cap height ≈ 0.13 × width, lines nearly touching, and
 * a clear pink margin above and below the block.
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

/** Wordmark size as a fraction of the panel width. */
const TYPE_SCALE = 0.18;
/** Line height as a fraction of the wordmark size — tight, as in the original. */
const LINE_RATIO = 0.88;
/** Negative tracking, as a fraction of the wordmark size. */
const TRACKING_RATIO = -0.015;
/** Pink margin above and below the type block, as a fraction of the width. */
const FIELD_PADDING = 0.05;

export type BrandLockupProps = {
  /** Width of the pink field, in points. */
  width: number;
  /** The two stacked words. Rendered uppercase. */
  lines: readonly [string, string];
  /** Small line under the wordmark, e.g. the caterer's name. */
  caption?: string;
  /** Corner radius on the bottom two corners, so the field can bleed off the top. */
  bottomRadius?: number;
};

export function BrandLockup({ width, lines, caption, bottomRadius = 32 }: BrandLockupProps) {
  const fontSize = Math.round(width * TYPE_SCALE);
  const lineHeight = Math.round(fontSize * LINE_RATIO);
  const padding = Math.round(width * FIELD_PADDING);

  const wordStyle = {
    color: brand.green,
    fontFamily: DISPLAY_FAMILY,
    fontSize,
    lineHeight,
    letterSpacing: Math.round(fontSize * TRACKING_RATIO),
    // Anton has no bold cut; asking for one triggers a synthetic face on web.
    fontWeight: '400' as const,
  };

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${lines[0]}${lines[1]}${caption ? `, ${caption}` : ''}`}
      style={{
        width,
        paddingVertical: padding,
        paddingHorizontal: padding,
        borderBottomLeftRadius: bottomRadius,
        borderBottomRightRadius: bottomRadius,
        backgroundColor: brand.pink,
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {lines.map((word) => (
        <Text
          key={word}
          allowFontScaling={false}
          style={wordStyle}
          {...WEB_DISPLAY_MARKER}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {word.toUpperCase()}
        </Text>
      ))}

      {caption ? (
        <Text
          allowFontScaling={false}
          style={{
            color: brand.green,
            marginTop: Math.round(fontSize * 0.16),
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1.6,
            opacity: 0.75,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {caption.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}
