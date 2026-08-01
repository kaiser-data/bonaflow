import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { DishPhoto } from '@/components/station/DishPhoto';
import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import type { Dish, Station } from '@/lib/store';
import { colors } from '@/lib/theme';

export type DishChoiceProps = {
  stations: readonly Station[];
  selectedDishId: string | null;
  onSelect: (stationId: string, dishId: string) => void;
  /** Reopen the picker after a bowl was chosen. */
  onChange: () => void;
  /** Dish ids this device has already rated, marked so nobody rates twice by mistake. */
  ratedDishIds?: readonly string[];
};

type Entry = { station: Station; dish: Dish };

const TILE_WIDTH = 132;
const TILE_PHOTO = 116;

/**
 * Which bowl did you eat.
 *
 * Photographs rather than names, because a guest recognises the bowl they just
 * finished faster than they read a menu line — and today's names are long. The
 * whole menu is one wrap-around grid rather than a column of wide rows, so five
 * bowls cost about a third of the screen instead of all of it, and the moment one
 * is chosen the grid collapses to a single line with a Change button. The point
 * of the collapse is that the microphone lands above the fold.
 */
export function DishChoice({
  stations,
  selectedDishId,
  onSelect,
  onChange,
  ratedDishIds = [],
}: DishChoiceProps) {
  const entries: Entry[] = stations.flatMap((station) =>
    station.dishes.map((dish) => ({ station, dish })),
  );

  const selected = entries.find((entry) => entry.dish.id === selectedDishId);

  if (selected !== undefined) {
    return (
      <View className="border-foreground bg-surface flex-row items-center gap-3 rounded-3xl border p-3">
        <DishPhoto image={selected.dish.image} name={selected.dish.name} size={44} />

        <View className="flex-1 gap-0.5">
          <Text className="text-foreground text-base font-semibold" numberOfLines={2}>
            {selected.dish.name}
          </Text>
          <MonoText className="text-muted text-[11px]">
            {selected.station.name}
            {ratedDishIds.includes(selected.dish.id) ? ' · already rated on this phone' : ''}
          </MonoText>
        </View>

        <Touchable
          accessibilityLabel="Choose a different bowl"
          onPress={onChange}
          className="border-border bg-background flex-none items-center justify-center rounded-2xl border px-3"
        >
          <Text className="text-foreground text-sm font-semibold">Change</Text>
        </Touchable>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {entries.map(({ station, dish }) => {
        const rated = ratedDishIds.includes(dish.id);

        return (
          <Touchable
            key={dish.id}
            accessibilityLabel={`${dish.name} at ${station.name}${rated ? ', already rated on this phone' : ''}`}
            onPress={() => onSelect(station.id, dish.id)}
            style={{ width: TILE_WIDTH }}
            className="border-border bg-surface flex-none items-center gap-2 rounded-3xl border p-2"
          >
            <View>
              <DishPhoto image={dish.image} name={dish.name} size={TILE_PHOTO} />
              {rated ? (
                <View className="bg-foreground absolute top-1 right-1 h-5 w-5 items-center justify-center rounded-full">
                  <Check color={colors.background} size={12} />
                </View>
              ) : null}
            </View>

            <View className="w-full gap-0.5">
              <Text
                className="text-foreground text-xs font-medium"
                numberOfLines={2}
                style={{ minHeight: 30 }}
              >
                {dish.name}
              </Text>
              <MonoText className="text-muted text-[10px]" numberOfLines={1}>
                {station.name}
              </MonoText>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}
