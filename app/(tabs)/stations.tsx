import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { DietFilterChips } from '@/components/station/DietFilterChips';
import { StationCard } from '@/components/station/StationCard';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useBonaFlowStore, type Station } from '@/lib/store';
import { dietPhrase, filterStations } from '@/lib/stations';

export default function StationsScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const dietFilter = useBonaFlowStore((state) => state.dietFilter);
  const event = useBonaFlowStore((state) => state.event);

  const visibleStations = useMemo(
    () => filterStations(stations, dietFilter),
    [stations, dietFilter],
  );

  const emptyMessage =
    dietFilter === 'all'
      ? 'No stations are listed yet.'
      : `No station currently has a ${dietPhrase(dietFilter)} option available.`;

  return (
    // The header supplies the top inset, the tab bar supplies the bottom inset.
    <Screen edges={['left', 'right']}>
      <FlatList<Station>
        className="flex-1"
        data={visibleStations}
        keyExtractor={(station) => station.id}
        renderItem={({ item }) => (
          <View className="px-5">
            <StationCard station={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-4 pb-5">
            <View className="gap-1 px-5">
              <Text className="text-foreground text-2xl font-semibold">{event.name}</Text>
              <MonoText className="text-muted text-xs">
                {event.venue} · lunch {event.serviceStart}–{event.serviceEnd}
              </MonoText>
            </View>
            <DietFilterChips />
          </View>
        }
        ListEmptyComponent={
          <View className="px-5 py-8">
            <Text className="text-foreground text-lg font-medium">{emptyMessage}</Text>
          </View>
        }
      />

      <View className="border-border bg-background border-t px-5 py-4">
        <Text className="text-muted text-xs">
          Demonstration data. Confirm allergens and ingredients with catering staff. Independent
          hackathon prototype.
        </Text>
      </View>
    </Screen>
  );
}
