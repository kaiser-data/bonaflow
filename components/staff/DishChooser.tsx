import { Modal, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DietPill } from '@/components/station/DietPill';
import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { shadow } from '@/lib/platform';
import type { Dish } from '@/lib/store';
import { availabilityLabel } from '@/lib/stations';

export type DishChooserProps = {
  visible: boolean;
  title: string;
  dishes: readonly Dish[];
  onSelect: (dishId: string) => void;
  onCancel: () => void;
};

/** Sheet that asks which dish a quick action applies to. */
export function DishChooser({ visible, title, dishes, onSelect, onCancel }: DishChooserProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <Touchable
          accessibilityLabel="Close dish list"
          onPress={onCancel}
          pressedClassName=""
          pressedScale={1}
          style={{ flex: 1 }}
        >
          <View className="flex-1" />
        </Touchable>

        <View
          className="bg-surface gap-4 rounded-t-3xl px-5 pt-5"
          style={[{ paddingBottom: insets.bottom + 20 }, shadow('lg')]}
        >
          <Text className="text-foreground text-xl font-semibold">{title}</Text>

          <View className="gap-2">
            {dishes.map((dish) => (
              <Touchable
                key={dish.id}
                accessibilityLabel={dish.name}
                onPress={() => onSelect(dish.id)}
                className="border-border bg-background gap-2 rounded-2xl border p-4"
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-foreground flex-1 text-base font-medium">{dish.name}</Text>
                  <MonoText className="text-muted text-xs">
                    {availabilityLabel(dish.availability)}
                  </MonoText>
                </View>
                {dish.tags.length > 0 ? (
                  <View className="flex-row flex-wrap gap-1.5">
                    {dish.tags.map((tag) => (
                      <DietPill key={tag} tag={tag} />
                    ))}
                  </View>
                ) : null}
              </Touchable>
            ))}
          </View>

          <Touchable
            accessibilityLabel="Cancel"
            onPress={onCancel}
            className="border-border items-center justify-center rounded-2xl border"
          >
            <Text className="text-foreground text-base font-semibold">Cancel</Text>
          </Touchable>
        </View>
      </View>
    </Modal>
  );
}
