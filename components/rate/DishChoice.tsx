import { Text, View } from 'react-native';

import { DishPhoto } from '@/components/station/DishPhoto';
import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import type { Dish, Station } from '@/lib/store';
import { cn } from '@/lib/utils';

export type DishChoiceProps = {
  stations: readonly Station[];
  selectedDishId: string | null;
  onSelect: (stationId: string, dishId: string) => void;
  /** Dish ids this device has already rated, marked so nobody rates twice by mistake. */
  ratedDishIds?: readonly string[];
};

type Entry = { station: Station; dish: Dish };

/**
 * Which bowl did you eat. Photographs rather than names, because a guest
 * recognises the bowl they just finished faster than they read a menu line —
 * and today's names are long.
 */
export function DishChoice({
  stations,
  selectedDishId,
  onSelect,
  ratedDishIds = [],
}: DishChoiceProps) {
  const entries: Entry[] = stations.flatMap((station) =>
    station.dishes.map((dish) => ({ station, dish })),
  );

  return (
    <View className="gap-2">
      {entries.map(({ station, dish }) => {
        const active = dish.id === selectedDishId;
        const rated = ratedDishIds.includes(dish.id);

        return (
          <Touchable
            key={dish.id}
            accessibilityLabel={`${dish.name} at ${station.name}`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(station.id, dish.id)}
            className={cn(
              'flex-row items-center gap-3 rounded-3xl border p-3',
              active ? 'border-foreground bg-surface' : 'border-border bg-surface',
            )}
          >
            <DishPhoto image={dish.image} name={dish.name} size={56} />

            <View className="flex-1 gap-0.5">
              <Text
                className={cn(
                  'text-foreground text-base',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {dish.name}
              </Text>
              <MonoText className="text-muted text-[11px]">
                {station.name}
                {rated ? ' · already rated on this phone' : ''}
              </MonoText>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}
