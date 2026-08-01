import { ScrollView, Text } from 'react-native';

import { Touchable } from '@/components/ui/Touchable';
import { useBonaFlowStore, type DietFilter } from '@/lib/store';
import { DIET_FILTERS } from '@/lib/stations';

/**
 * Dietary filter chips. Selection is neutral dark, not green: colour only ever
 * carries meaning in the station status dot.
 */
export function DietFilterChips() {
  const dietFilter = useBonaFlowStore((state) => state.dietFilter);
  const setDietFilter = useBonaFlowStore((state) => state.setDietFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {DIET_FILTERS.map((filter) => (
        <FilterChip
          key={filter.value}
          label={filter.label}
          value={filter.value}
          active={filter.value === dietFilter}
          onSelect={setDietFilter}
        />
      ))}
    </ScrollView>
  );
}

type FilterChipProps = {
  label: string;
  value: DietFilter;
  active: boolean;
  onSelect: (value: DietFilter) => void;
};

function FilterChip({ label, value, active, onSelect }: FilterChipProps) {
  return (
    <Touchable
      accessibilityLabel={`${label} filter`}
      accessibilityState={{ selected: active }}
      onPress={() => onSelect(value)}
      className={
        active
          ? 'bg-foreground flex-none items-center justify-center rounded-full px-5'
          : 'bg-surface border-border flex-none items-center justify-center rounded-full border px-5'
      }
    >
      <Text
        className={
          active
            ? 'text-background text-base font-semibold'
            : 'text-foreground text-base font-medium'
        }
      >
        {label}
      </Text>
    </Touchable>
  );
}
