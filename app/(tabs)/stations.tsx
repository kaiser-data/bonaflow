import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { AllergenDisclaimer } from '@/components/guest/AllergenDisclaimer';
import { DietFilterChips } from '@/components/station/DietFilterChips';
import { StationCard } from '@/components/station/StationCard';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useRateDish } from '@/hooks/useRateDish';
import { MENU_SOURCE_LINE } from '@/lib/menu';
import { useBonaFlowStore, type Station } from '@/lib/store';
import { dietPhrase, filterStations } from '@/lib/stations';

export default function StationsScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const dietFilter = useBonaFlowStore((state) => state.dietFilter);
  const event = useBonaFlowStore((state) => state.event);
  // Staff updates arrive on their own: no manual refresh anywhere in the app.
  const poll = useLivePoll();
  // Tapping a bowl here is the short way into a review: no tab hop, no second pick.
  const rateDish = useRateDish();

  const visibleStations = useMemo(
    () => filterStations(stations, dietFilter),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [stations, dietFilter, poll.revision],
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
            <StationCard station={item} onRateDish={rateDish} />
          </View>
        )}
        extraData={poll.tick}
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
              <MonoText className="text-muted text-[11px]">{MENU_SOURCE_LINE}</MonoText>
              <MonoText className="text-foreground text-[11px]">
                tap the bowl you ate to rate it
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

      <AllergenDisclaimer />
    </Screen>
  );
}
