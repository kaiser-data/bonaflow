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
  foreground: '#3A332B',
  /** Card / sheet surface */
  surface: '#FFFDFA',
  surfaceSecondary: '#FBF7F1',
  /** Secondary text */
  muted: '#8B8177',
  /** Terracotta brand accent */
  accent: '#B85C2E',
  accentForeground: '#FFFAF6',
  border: '#E6DCCF',
  separator: '#DCD0BF',
  success: '#4C8F55',
  warning: '#C99125',
  danger: '#C0452C',
  /** Shadow color for iOS shadows on the warm background */
  shadow: '#3A2A18',
} as const;

export type AppColor = keyof typeof colors;
