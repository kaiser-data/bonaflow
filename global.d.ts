declare module '*.css';

/**
 * Static image assets bundled by Metro. Expo's own types do not declare these, so
 * without this a `import logo from '@/assets/logo.png'` would not type-check and
 * the alternative — `require(...)` — hands back `any`.
 */
declare module '*.png' {
  const asset: import('react-native').ImageSourcePropType;
  export default asset;
}
