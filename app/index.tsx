import { Image, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import bellaBonaLogo from '@/assets/bellabona-logo.png';

import { MonoText } from '@/components/ui/MonoText';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { CONTENT_MAX_WIDTH } from '@/lib/platform';
import { brand } from '@/lib/theme';
import { useBonaFlowStore, type AppMode } from '@/lib/store';

const MODE_BUTTON_HEIGHT = 76;

/** Horizontal padding of the content column, in points. Matches px-6 below. */
const COLUMN_PADDING = 24;

/**
 * Visible slice of the logo file, as a fraction of the column width.
 *
 * The supplied artwork is a square pink tile whose wordmark sits in the middle
 * ~40% of its height. Shown whole it would be mostly empty pink, so the band
 * crops it symmetrically; 0.46 keeps a clear margin above BELLA and below BONA at
 * every width.
 */
const LOGO_CROP = 0.46;

/** Start screen. Switches views only — no accounts, passwords or roles. */
export default function ModeSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const event = useBonaFlowStore((state) => state.event);
  const setMode = useBonaFlowStore((state) => state.setMode);

  // The logo band bleeds to the edges of the content column, which is the window
  // width on a phone and the capped column on a desktop or a projector mirror.
  const columnWidth = Math.min(width - insets.left - insets.right, CONTENT_MAX_WIDTH);
  const bandHeight = Math.round(columnWidth * LOGO_CROP);

  const choose = (mode: AppMode) => {
    setMode(mode);
    if (mode === 'guest') {
      router.push('/stations');
      return;
    }
    router.push(mode === 'staff' ? '/staff/report' : '/operations/overview');
  };

  return (
    <Screen scroll contentClassName="justify-between gap-8 px-6 pb-8">
      <View className="gap-5">
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Bella&Bona"
          style={{
            width: columnWidth,
            height: bandHeight,
            marginHorizontal: -COLUMN_PADDING,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            overflow: 'hidden',
            backgroundColor: brand.pink,
          }}
        >
          <Image
            source={bellaBonaLogo}
            resizeMode="cover"
            style={{
              width: columnWidth,
              height: columnWidth,
              marginTop: -Math.round((columnWidth - bandHeight) / 2),
            }}
          />
        </View>

        <View className="gap-2">
          <Text className="text-4xl font-bold" style={{ color: brand.green }}>
            BonaFlow
          </Text>
          <Text className="text-muted text-lg">Find food faster. Keep every station flowing.</Text>
        </View>
      </View>

      <View className="gap-4">
        <Touchable
          accessibilityLabel="Continue as guest"
          onPress={() => choose('guest')}
          className="bg-accent flex-none items-center justify-center rounded-3xl px-6"
          style={{ minHeight: MODE_BUTTON_HEIGHT }}
        >
          <Text className="text-accent-foreground text-2xl font-semibold">Guest</Text>
        </Touchable>

        <Touchable
          accessibilityLabel="Continue as staff"
          onPress={() => choose('staff')}
          className="bg-surface border-border flex-none items-center justify-center rounded-3xl border px-6"
          style={{ minHeight: MODE_BUTTON_HEIGHT }}
        >
          <Text className="text-foreground text-2xl font-semibold">Staff</Text>
        </Touchable>

        <Touchable
          accessibilityLabel="Continue to operations"
          onPress={() => choose('operations')}
          className="bg-surface border-border flex-none items-center justify-center rounded-3xl border px-6"
          style={{ minHeight: MODE_BUTTON_HEIGHT }}
        >
          <Text className="text-foreground text-2xl font-semibold">Operations</Text>
        </Touchable>
      </View>

      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-muted text-base">{event.name}</Text>
          <MonoText className="text-muted text-xs">
            {event.venue} · {event.guests} guests · lunch {event.serviceStart}–{event.serviceEnd}
          </MonoText>
          <Touchable
            accessibilityLabel="Join by scanning the event code"
            onPress={() => router.push('/join')}
            className="flex-none items-start justify-center"
          >
            <Text className="text-base font-semibold underline" style={{ color: brand.green }}>
              Join by event code
            </Text>
          </Touchable>
        </View>

        {/* Web only, and only here: installing is a start-screen decision, and on
            the dish screens a floating banner would sit on the allergen line. */}
        <InstallPrompt />
      </View>
    </Screen>
  );
}
