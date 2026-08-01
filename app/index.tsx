import { Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DisplayHeading } from '@/components/brand/DisplayHeading';
import { DishPhoto } from '@/components/station/DishPhoto';
import { InstallPrompt } from '@/components/InstallPrompt';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { useRateDish } from '@/hooks/useRateDish';
import { CONTENT_MAX_WIDTH } from '@/lib/platform';
import { POINTS_BASE, POINTS_REASON_BONUS, POINTS_VOICE_BONUS, REWARDS } from '@/lib/rewards';
import { brand } from '@/lib/theme';
import { useBonaFlowStore, type AppMode } from '@/lib/store';

/** Horizontal padding of the content column, in points. Matches px-6 below. */
const COLUMN_PADDING = 24;

/** Display size of the headline, as a fraction of the text column width. */
const HEADLINE_SCALE = 0.155;

/** Ceiling for the headline, so the mark does not balloon on a wide window. */
const HEADLINE_MAX_SIZE = 58;

/** Decorative pink rule under the headline. */
const RULE_HEIGHT = 8;
const RULE_WIDTH_RATIO = 0.32;

/** Bowls offered as a one-tap way into a review. */
const BOWL_TILES = 4;
const TILE_GAP = 8;

const PRIMARY_BUTTON_HEIGHT = 76;
const SECONDARY_BUTTON_HEIGHT = 60;

/** The cheapest thing the organiser is handing out, quoted as proof of the offer. */
const CHEAPEST_REWARD = REWARDS.reduce(
  (cheapest, reward) => (reward.cost < cheapest.cost ? reward : cheapest),
  REWARDS[0],
);

/**
 * Start screen. Switches views only — no accounts, passwords or roles.
 *
 * The headline is the product promise rather than a logo: nearly everyone who
 * opens this is a guest holding a tray, and what they need to know in one glance
 * is that saying something about the bowl earns something at the counter. The
 * house design survives as its typography — heavy condensed uppercase in the
 * house green over the warm off-white, with the pink kept as decoration only.
 */
export default function ModeSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const event = useBonaFlowStore((state) => state.event);
  const stations = useBonaFlowStore((state) => state.stations);
  const setMode = useBonaFlowStore((state) => state.setMode);
  const rateDish = useRateDish();

  // The window width on a phone, the capped column on a desktop or a projector.
  const columnWidth = Math.min(width - insets.left - insets.right, CONTENT_MAX_WIDTH);
  const textWidth = columnWidth - COLUMN_PADDING * 2;
  const headlineSize = Math.min(Math.round(textWidth * HEADLINE_SCALE), HEADLINE_MAX_SIZE);

  // Real photos of today's bowls. They are the best asset in the app and they say
  // what the app is about faster than any illustration would.
  const bowls = stations
    .flatMap((station) => station.dishes.map((dish) => ({ station, dish })))
    .filter((entry) => entry.dish.image.length > 0)
    .slice(0, BOWL_TILES);

  const tileSize =
    bowls.length === 0 ? 0 : Math.floor((textWidth - TILE_GAP * (bowls.length - 1)) / bowls.length);

  const choose = (mode: AppMode) => {
    setMode(mode);
    if (mode === 'guest') {
      router.push('/stations');
      return;
    }
    router.push(mode === 'staff' ? '/staff/report' : '/operations/overview');
  };

  // Tapping a bowl here is the shortest path there is: it picks the view, records
  // which bowl it was and opens the Rate screen with the microphone in reach.
  const rateBowl = (stationId: string, dishId: string) => {
    setMode('guest');
    rateDish(stationId, dishId);
  };

  return (
    <Screen scroll contentClassName="justify-between gap-7 px-6 pb-8 pt-6">
      <View className="gap-5">
        <View className="flex-row">
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: brand.pink }}>
            <Text
              style={{ color: brand.green, fontSize: 11, letterSpacing: 1.4 }}
              className="font-semibold"
            >
              BELLA&BONA LUNCH
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <DisplayHeading
            lines={['Rate food', 'Get rewards']}
            size={headlineSize}
            color={brand.green}
          />
          <View
            style={{
              width: Math.round(textWidth * RULE_WIDTH_RATIO),
              height: RULE_HEIGHT,
              borderRadius: RULE_HEIGHT / 2,
              backgroundColor: brand.pink,
            }}
          />
        </View>

        <Text className="text-muted text-lg">
          Say how your bowl was and what you left behind. Thirty seconds tells the kitchen what to
          cook — and pays you back at the counter today.
        </Text>

        <MonoText className="text-muted text-xs">
          {POINTS_BASE} points a review · +{POINTS_REASON_BONUS} for saying why · +
          {POINTS_VOICE_BONUS} for speaking it · {CHEAPEST_REWARD.cost} points ={' '}
          {CHEAPEST_REWARD.label.toLowerCase()}
        </MonoText>
      </View>

      {bowls.length > 0 ? (
        <View className="gap-2">
          <Text className="text-foreground text-base font-semibold">
            Already eaten? Tap your bowl
          </Text>
          <View className="flex-row" style={{ gap: TILE_GAP }}>
            {bowls.map(({ station, dish }) => (
              <Touchable
                key={dish.id}
                accessibilityLabel={`Rate ${dish.name}`}
                onPress={() => rateBowl(station.id, dish.id)}
                className="flex-none"
              >
                <DishPhoto image={dish.image} name={dish.name} size={tileSize} />
              </Touchable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-3">
        <Touchable
          accessibilityLabel="Continue as guest"
          onPress={() => choose('guest')}
          className="bg-accent flex-none items-center justify-center gap-1 rounded-3xl px-6"
          style={{ minHeight: PRIMARY_BUTTON_HEIGHT }}
        >
          <Text className="text-accent-foreground text-2xl font-semibold">Find food & rate it</Text>
          <Text className="text-accent-foreground text-xs opacity-80">
            Guest · stations, bowls and points
          </Text>
        </Touchable>

        <View className="flex-row" style={{ gap: 12 }}>
          <Touchable
            accessibilityLabel="Continue as staff"
            onPress={() => choose('staff')}
            className="bg-surface border-border flex-1 items-center justify-center rounded-3xl border px-4"
            style={{ minHeight: SECONDARY_BUTTON_HEIGHT }}
          >
            <Text className="text-foreground text-lg font-semibold">Staff</Text>
          </Touchable>

          <Touchable
            accessibilityLabel="Continue to operations"
            onPress={() => choose('operations')}
            className="bg-surface border-border flex-1 items-center justify-center rounded-3xl border px-4"
            style={{ minHeight: SECONDARY_BUTTON_HEIGHT }}
          >
            <Text className="text-foreground text-lg font-semibold">Operations</Text>
          </Touchable>
        </View>
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
