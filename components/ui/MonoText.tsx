import { Text, type TextProps } from 'react-native';

import { monoTextStyle } from '@/lib/platform';
import { cn } from '@/lib/utils';

export type MonoTextProps = TextProps & { className?: string };

/**
 * Monospaced text. Uses Menlo on iOS and monospace on Android; the string
 * "monospace" alone does not resolve on iOS and falls back silently.
 */
export function MonoText({ className, style, ...rest }: MonoTextProps) {
  return (
    <Text className={cn('text-foreground', className)} style={[monoTextStyle, style]} {...rest} />
  );
}
