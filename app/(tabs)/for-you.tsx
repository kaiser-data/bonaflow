import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { DietFilterChips } from '@/components/station/DietFilterChips';
import { DishRow } from '@/components/station/DishRow';
import { IncentiveChip } from '@/components/station/IncentiveChip';
import { StatusDot } from '@/components/station/StatusDot';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useRateDish } from '@/hooks/useRateDish';
import { findDish, findStation, useBonaFlowStore } from '@/lib/store';
import {
  dietPhrase,
  formatClock,
  incentiveForStation,
  queueLabel,
  statusLabel,
} from '@/lib/stations';

export default function ForYouScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const dietFilter = useBonaFlowStore((state) => state.dietFilter);
  const recommendations = useBonaFlowStore((state) => state.recommendations);
  const event = useBonaFlowStore((state) => state.event);
  // No refresh button anywhere: the store pushes changes and this polls it.
  const poll = useLivePoll();
  const rateDish = useRateDish();

  const recommendation = useMemo(() => {
    const ref = recommendations[dietFilter];
    if (ref === null) return null;

    const station = findStation(stations, ref.stationId);
    const dish = findDish(station, ref.dishId);
    if (station === undefined || dish === undefined) return null;

    return { station, dish, reason: ref.reason };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
  }, [recommendations, dietFilter, stations, poll.revision]);

  const incentive =
    recommendation === null
      ? null
      : incentiveForStation(event.incentive, recommendation.station.id);

  const noneMessage =
    dietFilter === 'all'
      ? 'No station currently has an available dish.'
      : `No station currently has a ${dietPhrase(dietFilter)} option available.`;

  return (
    <Screen scroll edges={['left', 'right']}>
      <View className="gap-5 py-2 pb-8">
        <DietFilterChips />

        {recommendation === null ? (
          <View className="px-5 py-8">
            <Text className="text-foreground text-lg font-medium">{noneMessage}</Text>
          </View>
        ) : (
          <View className="px-5">
            <Card level="md" className="gap-5 rounded-3xl p-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <View className="gap-1">
                    <Text className="text-foreground text-2xl font-semibold">
                      {recommendation.station.name}
                    </Text>
                    <Text className="text-muted text-base">{recommendation.station.location}</Text>
                  </View>
                  {incentive === null ? null : <IncentiveChip incentive={incentive} />}
                </View>
                <View className="items-center gap-1.5">
                  <StatusDot status={recommendation.station.status} />
                  <MonoText className="text-muted text-[11px]">
                    {statusLabel(recommendation.station.status)}
                  </MonoText>
                </View>
              </View>

              <MonoText className="text-foreground text-sm">{recommendation.reason}</MonoText>

              <View className="border-separator gap-4 border-t pt-4">
                <DishRow
                  dish={recommendation.dish}
                  onRate={() => rateDish(recommendation.station.id, recommendation.dish.id)}
                />
              </View>

              <MonoText className="text-muted text-xs">
                queue: {queueLabel(recommendation.station.queue)} · last update{' '}
                {formatClock(recommendation.station.lastUpdatedAt)}
              </MonoText>
            </Card>
          </View>
        )}
      </View>
    </Screen>
  );
}
