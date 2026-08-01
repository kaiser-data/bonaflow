import { Text, View } from 'react-native';

import { Disclosure } from '@/components/ui/Disclosure';

/** The part that has to be legible without a tap. */
export const ALLERGEN_DISCLAIMER =
  'Allergens are shown as printed on the bowl label. Always confirm with the catering team.';

/** The caveat behind it: true, needed, but not on every read. */
export const ALLERGEN_DETAIL =
  'Where a label could not be read, its allergens are marked not recorded — which is not the same as none. Independent hackathon prototype, not affiliated with Bella&Bona.';

/**
 * The required line under any screen that lists dishes.
 *
 * It is the last row of the screen — a sibling of the list, above the tab bar —
 * and never an overlay. Laid out in the normal flow it takes its own space, so it
 * cannot be covered and it stays readable at whatever number of lines the text
 * wraps to at that width.
 *
 * The allergen statement itself is never collapsed. Only the explanation of what
 * "not recorded" means and the prototype notice sit behind the toggle, which is
 * what keeps this footer one line high on a phone.
 */
export function AllergenDisclaimer() {
  return (
    <View className="border-border bg-background gap-1 border-t px-5 py-3">
      <Text className="text-muted text-xs">{ALLERGEN_DISCLAIMER}</Text>
      <Disclosure tone="note" title="allergens not recorded, and who made this">
        <Text className="text-muted text-xs">{ALLERGEN_DETAIL}</Text>
      </Disclosure>
    </View>
  );
}
