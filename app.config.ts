import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }], 'react-native-maps']
      : [];

  return {
    ...config,
    name: 'BonaFlow',
    slug: 'bonaflow',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    backgroundColor: '#FAF6F0',
    scheme: 'bonaflow',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          'BonaFlow uses the microphone so catering staff can report station updates by voice.',
        NSCameraUsageDescription:
          'BonaFlow uses the camera to scan the event code and to photograph a serving tray.',
        NSPhotoLibraryUsageDescription:
          'BonaFlow lets staff attach an existing photo of a serving tray.',
      },
      supportsTablet: false,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.yourcompany.yourapp',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.yourcompany.yourapp',
      permissions: ['RECORD_AUDIO', 'CAMERA'],
    },
    web: {
      bundler: 'metro',
      // 'single' = SPA export: one index.html + client routing, so edge serving
      // needs only a single 404→index.html fallback rule.
      output: 'single',
      favicon: './public/icons/icon-192.png',
    },
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
      // Second route for the backend credentials: read when the config is
      // evaluated, so the app still connects if Metro's cached transform of
      // lib/backend.ts predates the credentials. See lib/backend.ts.
      biltUrl: process.env.EXPO_PUBLIC_BILT_URL,
      biltAnonKey: process.env.EXPO_PUBLIC_BILT_ANON_KEY,
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-audio',
        {
          microphonePermission:
            'BonaFlow uses the microphone so catering staff can report station updates by voice.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'BonaFlow uses the camera to scan the event code.',
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-image-picker',
        {
          cameraPermission:
            'BonaFlow uses the camera so catering staff can photograph a serving tray.',
          photosPermission: 'BonaFlow lets staff attach an existing photo of a serving tray.',
        },
      ],
      ...nativePlugins,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
