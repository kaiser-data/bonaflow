import { Platform, Text, type TextProps } from 'react-native';

import { monoTextStyle } from '@/lib/platform';
import { cn } from '@/lib/utils';

export type MonoTextProps = TextProps & { className?: string };

/**
 * react-native-web forwards `dataSet` to the DOM as `data-*` attributes. The web
 * build applies the app typeface to every text node in CSS (public/index.html),
 * because react-native-web writes a font onto each one and plain inheritance from
 * <body> loses; `data-mono` is how monospaced text opts out of that rule. The prop
 * is web-only and is not passed on native.
 */
type WebTextProps = TextProps & { dataSet?: Record<string, string> };

const WEB_MONO_MARKER: WebTextProps = Platform.OS === 'web' ? { dataSet: { mono: 'true' } } : {};

/**
 * Monospaced text. Uses Menlo on iOS and monospace on Android; the string
 * "monospace" alone does not resolve on iOS and falls back silently.
 */
export function MonoText({ className, style, ...rest }: MonoTextProps) {
  return (
    <Text
      className={cn('text-foreground', className)}
      style={[monoTextStyle, style]}
      {...WEB_MONO_MARKER}
      {...rest}
    />
  );
}
