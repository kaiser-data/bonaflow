import { Text, View } from 'react-native';

import { DishRow } from '@/components/station/DishRow';
import { StatusDot } from '@/components/station/StatusDot';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import type { Station } from '@/lib/store';
import { formatClock, queueLabel, statusLabel } from '@/lib/stations';

export type StationCardProps = { station: Station };

/** Rounded station card: name, location, status dot, queue, dishes, last update. */
export function StationCard({ station }: StationCardProps) {
  return (
    <Card level="md" className="gap-5 rounded-3xl p-5">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-foreground text-xl font-semibold">{station.name}</Text>
          <Text className="text-muted text-base">{station.location}</Text>
        </View>

        <View className="items-center gap-1.5">
          <StatusDot status={station.status} />
          <MonoText className="text-muted text-[11px]">{statusLabel(station.status)}</MonoText>
        </View>
      </View>

      <MonoText className="text-foreground text-sm">queue: {queueLabel(station.queue)}</MonoText>

      <View className="border-separator gap-4 border-t pt-4">
        {station.dishes.map((dish) => (
          <DishRow key={dish.id} dish={dish} />
        ))}
      </View>

      <MonoText className="text-muted text-xs">
        last update {formatClock(station.lastUpdatedAt)}
      </MonoText>
    </Card>
  );
}
