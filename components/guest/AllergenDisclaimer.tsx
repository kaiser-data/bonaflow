import { Text, View } from 'react-native';

export const ALLERGEN_DISCLAIMER =
  'Allergens are shown as printed on the bowl label; where a label could not be read they are marked not recorded. Always confirm with the catering team. Independent hackathon prototype, not affiliated with Bella&Bona.';

/**
 * The required line under any screen that lists dishes.
 *
 * It is the last row of the screen — a sibling of the list, above the tab bar —
 * and never an overlay. Laid out in the normal flow it takes its own space, so it
 * cannot be covered and it stays readable at whatever number of lines the text
 * wraps to at that width.
 */
export function AllergenDisclaimer() {
  return (
    <View className="border-border bg-background border-t px-5 py-3">
      <Text className="text-muted text-xs">{ALLERGEN_DISCLAIMER}</Text>
    </View>
  );
}
