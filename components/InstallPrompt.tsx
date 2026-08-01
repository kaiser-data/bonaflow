import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Touchable } from '@/components/ui/Touchable';

/**
 * Install affordance for the PWA, web only:
 * - Android/Chrome: captures `beforeinstallprompt` and shows an "Install" button
 *   that triggers the native install prompt.
 * - iOS/Safari: no programmatic prompt exists, so shows a one-time
 *   "Share → Add to Home Screen" hint (dismissal persisted).
 *
 * Hidden when already installed (standalone display mode) and inside iframes
 * (the Bilt live preview embeds the app in one).
 *
 * Laid out in the normal flow, one line high, and mounted by the start screen
 * only. It used to be pinned above the tab bar on every screen, which put it on
 * top of the allergen line on the stations screen and made both unreadable. An
 * optional convenience must never cover a line the app is required to show.
 */

// Chrome's install event — not yet in lib.dom.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const IOS_HINT_DISMISSED_KEY = 'pwa-ios-install-hint-dismissed';

function isEligibleBrowserContext(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  // Already installed / running standalone (navigator.standalone is iOS-only).
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Reflect.get(navigator, 'standalone') === true;
  if (standalone) return false;
  // Embedded (e.g. the Bilt live preview iframe) — installing isn't possible there.
  if (window.self !== window.top) return false;
  return true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ masquerades as macOS but is touch-capable.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (!isEligibleBrowserContext()) return undefined;

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const handleAppInstalled = () => {
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isEligibleBrowserContext() || !isIosSafari()) return;

    void (async () => {
      try {
        const dismissed = await AsyncStorage.getItem(IOS_HINT_DISMISSED_KEY);
        if (!dismissed) {
          setShowIosHint(true);
        }
      } catch (_error) {
        // no-op on storage errors
      }
    })();
  }, []);

  const handleInstall = useCallback(() => {
    if (!installEvent) return;
    void (async () => {
      await installEvent.prompt();
      await installEvent.userChoice;
      // The captured event is single-use regardless of the user's choice.
      setInstallEvent(null);
    })();
  }, [installEvent]);

  const dismiss = useCallback(() => {
    setInstallEvent(null);
    if (showIosHint) {
      setShowIosHint(false);
      AsyncStorage.setItem(IOS_HINT_DISMISSED_KEY, 'true').catch(() => {});
    }
  }, [showIosHint]);

  if (Platform.OS !== 'web') return null;

  const canInstall = installEvent !== null;
  if (!canInstall && !showIosHint) return null;

  return (
    <View className="border-border bg-surface flex-row items-center gap-1 rounded-2xl border pr-2 pl-3">
      <Text className="text-foreground flex-1 text-xs" numberOfLines={1}>
        {canInstall ? 'Add BonaFlow to your home screen' : 'Share, then “Add to Home Screen”'}
      </Text>

      <Touchable
        accessibilityLabel={canInstall ? 'Not now' : 'Got it'}
        onPress={dismiss}
        pressedScale={1}
        className="flex-none items-center justify-center px-2"
      >
        <Text className="text-muted text-xs font-semibold">
          {canInstall ? 'Not now' : 'Got it'}
        </Text>
      </Touchable>

      {canInstall ? (
        <Touchable
          accessibilityLabel="Install this app"
          onPress={handleInstall}
          className="bg-accent my-1.5 flex-none items-center justify-center rounded-xl px-3"
          style={{ minHeight: 32 }}
        >
          <Text className="text-accent-foreground text-xs font-semibold">Install</Text>
        </Touchable>
      ) : null}
    </View>
  );
}
