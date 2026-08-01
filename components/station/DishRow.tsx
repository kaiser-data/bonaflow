import { Text, View } from 'react-native';

import { DietPill } from '@/components/station/DietPill';
import { MonoText } from '@/components/ui/MonoText';
import type { Dish } from '@/lib/store';
import { availabilityLabel } from '@/lib/stations';

export type DishRowProps = { dish: Dish };

/** One dish: name, dietary tags, availability label in the monospace font. */
export function DishRow({ dish }: DishRowProps) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 gap-2">
        <Text className="text-foreground text-base font-medium">{dish.name}</Text>
        {dish.tags.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {dish.tags.map((tag) => (
              <DietPill key={tag} tag={tag} />
            ))}
          </View>
        ) : null}
      </View>
      <MonoText className="text-muted pt-0.5 text-xs">
        {availabilityLabel(dish.availability)}
      </MonoText>
    </View>
  );
}
