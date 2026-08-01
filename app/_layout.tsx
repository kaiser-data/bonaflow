// oxlint-disable-next-line eslint-plugin-import/no-unassigned-import
import '../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
// Display face for the app's headline type: heavy condensed uppercase, the house
// design's typographic voice. Used by components/brand/DisplayHeading.tsx only.
import { Anton_400Regular } from '@expo-google-fonts/anton';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import * as DevClient from 'expo-dev-client';
import { HeroUINativeProvider } from 'heroui-native';
import { Uniwind } from 'uniwind';
import {
  ErrorBoundary as ExpoErrorBoundary,
  type ErrorBoundaryProps,
  SplashScreen,
  Stack,
} from 'expo-router';

import { colors } from '@/lib/theme';
import { prewarmStageAnnouncements } from '@/lib/announce';
import { initPostHog } from '@/lib/posthog';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
import { reportErrorToParent } from '@/lib/reportPreviewError';
import { useBackendSync } from '@/lib/sync';

/**
 * Custom ErrorBoundary that reports React render errors to the parent window (Bilt preview iframe)
 * and then renders the default Expo error UI.
 */
function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (Platform.OS === 'web' && error) {
      const message = [error.message, error.stack].filter(Boolean).join('\n');
      reportErrorToParent(message);
    }
  }, [error]);
  return <ExpoErrorBoundary error={error} retry={retry} />;
}

export { ErrorBoundary };

// Starter is light-only by default. Remove this when implementing requested dark mode.
Uniwind.setTheme('light');

// Dark glyphs stay legible on the warm off-white background on iOS and Android.
const STATUS_BAR_STYLE: StatusBarStyle = 'dark';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Anton_400Regular,
  });

  // Report uncaught JS errors and unhandled promise rejections to parent (Bilt preview iframe)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const handleError = (event: ErrorEvent) => {
      const message = event.error?.stack ?? event.message ?? 'Unknown error';
      reportErrorToParent(message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const message =
        err instanceof Error ? [err.message, err.stack].filter(Boolean).join('\n') : String(err);
      reportErrorToParent(message);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (__DEV__ && Platform.OS !== 'web' && !isExpoGo) {
      const timer = setTimeout(() => {
        DevClient.closeMenu();
        DevClient.hideMenu();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      initPostHog();
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // One backend poll for the whole device: hydrates the shared store every three
  // seconds so guest, staff and operations views follow reports made elsewhere.
  useBackendSync();

  // Generates the two spoken announcement lines while the app is starting, so the
  // stage path plays from the device instead of waiting on a network call. Silent
  // on failure: every announcement is on screen as text as well.
  useEffect(() => {
    void prewarmStageAnnouncements();
  }, []);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          {/* Dark glyphs stay legible on the warm off-white background on iOS and Android */}
          <StatusBar style={STATUS_BAR_STYLE} translucent />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
              headerTitleStyle: { color: colors.foreground },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'BonaFlow', headerShown: false }} />
            <Stack.Screen name="join" options={{ title: 'Join event' }} />
            <Stack.Screen name="(tabs)" options={{ title: 'BonaFlow', headerShown: false }} />
            <Stack.Screen name="staff" options={{ title: 'Staff', headerShown: false }} />
            <Stack.Screen name="staff-confirm" options={{ title: 'Confirm update' }} />
            <Stack.Screen name="rate-confirm" options={{ title: 'Check your review' }} />
            <Stack.Screen name="rewards" options={{ title: 'Your points' }} />
            <Stack.Screen
              name="staff-override"
              options={{
                title: 'Demo override',
                presentation: 'modal',
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen name="operations" options={{ title: 'Operations', headerShown: false }} />
          </Stack>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
