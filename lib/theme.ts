/**
 * Native-safe color constants.
 *
 * The source of truth for the palette is `global.css` (HeroUI semantic tokens in
 * oklch). React Native cannot parse `oklch(...)` when a color is passed through
 * a plain prop (navigation tints, StatusBar, icon `color`, `shadowColor`), so
 * these hex values mirror the CSS tokens for those cases.
 *
 * Use `className` (bg-background, text-foreground, ...) inside JSX. Use these
 * constants only where a raw color string is required.
 */
export const colors = {
  /** Warm off-white app background */
  background: '#FAF6F0',
  /** Near-black warm brown, primary text */
  foreground: '#33302B',
  /** Card / sheet surface */
  surface: '#FFFDFA',
  surfaceSecondary: '#F5F1EA',
  /** Secondary text */
  muted: '#857F76',
  /** Deep green brand accent */
  accent: '#0F766E',
  accentForeground: '#F4FBF9',
  border: '#E6DFD4',
  separator: '#DCD3C5',
  /** Shadow color for iOS shadows on the warm background */
  shadow: '#2C2419',
} as const;

/**
 * Reserved status colours. These four values carry meaning and must never be
 * reused for decoration, text, chips, icons or backgrounds anywhere else.
 *   green  available
 *   orange running low or busy
 *   red    sold out, closed or urgent
 *   grey   no recent update
 */
export const statusColors = {
  green: '#0F766E',
  orange: '#F08A4B',
  red: '#B4432B',
  grey: '#D8DDD6',
} as const;

export type AppColor = keyof typeof colors;
export type StatusColor = keyof typeof statusColors;
