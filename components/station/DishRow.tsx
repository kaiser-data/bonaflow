import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { DietPill } from '@/components/station/DietPill';
import { DishPhoto } from '@/components/station/DishPhoto';
import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { allergenLine, allergensMissing, OBSERVED_CAPTION, observedLine } from '@/lib/menu';
import type { Dish } from '@/lib/store';
import { availabilityLabel } from '@/lib/stations';
import { colors } from '@/lib/theme';

export type DishRowProps = {
  dish: Dish;
  /** Hide the photo and the contents where space is tight, e.g. the ops list. */
  compact?: boolean;
  /**
   * Guest screens pass this to make the whole row — photo included — the way into
   * a review. Staff and operations leave it out, so the same row stays read-only
   * for them.
   */
  onRate?: () => void;
};

/**
 * One dish exactly as the caterer labelled it.
 *
 * Three kinds of information, kept visually apart on purpose: the dietary tags
 * and allergens printed on the bowl label; what was seen in the open bowl,
 * captioned as description only; and, where the label could not be read, a plain
 * statement that the allergens are not recorded. The app never says a dish is
 * safe or that anyone can eat it.
 */
export function DishRow({ dish, compact = false, onRate }: DishRowProps) {
  const observed = observedLine(dish);
  const missing = allergensMissing(dish);

  const body = (
    <View className="flex-row items-start gap-3">
      {compact ? null : <DishPhoto image={dish.image} name={dish.name} />}

      <View className="flex-1 gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="text-foreground flex-1 text-base font-medium">{dish.name}</Text>
          <MonoText className="text-muted pt-0.5 text-xs">
            {availabilityLabel(dish.availability)}
          </MonoText>
        </View>

        {dish.tags.length === 0 ? null : (
          <View className="flex-row flex-wrap gap-1.5">
            {dish.tags.map((tag) => (
              <DietPill key={tag} tag={tag} />
            ))}
          </View>
        )}

        <MonoText className={missing ? 'text-foreground text-[11px]' : 'text-muted text-[11px]'}>
          {allergenLine(dish)}
        </MonoText>

        {compact || observed === null ? null : (
          <View className="gap-0.5">
            <Text className="text-muted text-xs">{observed}</Text>
            <MonoText className="text-muted text-[10px]">{OBSERVED_CAPTION}</MonoText>
          </View>
        )}

        {dish.note === null ? null : (
          <MonoText className="text-muted text-[10px]">{dish.note}</MonoText>
        )}

        {onRate === undefined ? null : (
          <View className="flex-row items-center gap-1 pt-0.5">
            <MonoText className="text-foreground text-[11px]">rate this bowl</MonoText>
            <ChevronRight color={colors.foreground} size={13} />
          </View>
        )}
      </View>
    </View>
  );

  if (onRate === undefined) return body;

  return (
    <Touchable
      accessibilityLabel={`Rate ${dish.name}`}
      accessibilityHint="Opens the rating screen for this bowl"
      onPress={onRate}
      pressedScale={0.99}
      className="rounded-2xl"
    >
      {body as ReactNode}
    </Touchable>
  );
}
