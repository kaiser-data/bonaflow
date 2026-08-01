import { Text, View } from 'react-native';

import { StatusDot } from '@/components/station/StatusDot';
import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { shadow } from '@/lib/platform';
import type { Station } from '@/lib/store';
import { queueLabel } from '@/lib/stations';
import { cn } from '@/lib/utils';

export type StationPickerGridProps = {
  stations: readonly Station[];
  selectedStationId: string;
  onSelect: (stationId: string) => void;
};

/** Four large station buttons. No login, no roles — it only picks a station. */
export function StationPickerGrid({
  stations,
  selectedStationId,
  onSelect,
}: StationPickerGridProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {stations.map((station) => {
        const active = station.id === selectedStationId;

        return (
          <Touchable
            key={station.id}
            accessibilityLabel={`Report for ${station.name}`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(station.id)}
            style={[{ width: '48%', minHeight: 104 }, shadow('sm')]}
            className={cn(
              'justify-between rounded-3xl border p-4',
              active ? 'border-foreground bg-surface' : 'border-border bg-surface',
            )}
          >
            <View className="flex-row items-start justify-between gap-2">
              <MonoText className={cn('text-xs', active ? 'text-foreground' : 'text-muted')}>
                station {station.code}
              </MonoText>
              <StatusDot status={station.status} size={16} />
            </View>

            <View className="gap-0.5">
              <Text
                className={cn('text-foreground text-base', active ? 'font-bold' : 'font-semibold')}
              >
                {station.name}
              </Text>
              <MonoText className="text-muted text-[11px]">
                queue: {queueLabel(station.queue)}
              </MonoText>
            </View>
          </Touchable>
        );
      })}
    </View>
  );
}
