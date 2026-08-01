import { Text, View } from 'react-native';
import { Switch } from 'heroui-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { findStation, useBonaFlowStore } from '@/lib/store';
import { incentiveAttribution, isStale } from '@/lib/stations';

/**
 * The operations lever for the incentive.
 *
 * Turning it on is a state change like any other: it goes to the backend and
 * appears on the guest recommendation, and in the spoken announcement, on the
 * next poll of every other device.
 *
 * Nothing else can set it. The reading service has no field for an offer, and any
 * offer wording it produces is discarded before it reaches a screen — so an
 * offer a guest sees was always switched on here, by a person.
 */
export function IncentiveToggle() {
  const event = useBonaFlowStore((state) => state.event);
  const stations = useBonaFlowStore((state) => state.stations);
  const setIncentiveActive = useBonaFlowStore((state) => state.setIncentiveActive);

  const incentive = event.incentive;

  if (incentive === null) {
    return (
      <Card level="sm" className="border-border gap-1 rounded-3xl border p-4">
        <Text className="text-foreground text-base font-semibold">Incentive</Text>
        <MonoText className="text-muted text-[11px]">
          no incentive is configured for this event
        </MonoText>
      </Card>
    );
  }

  const station = findStation(stations, incentive.appliesToStationId);

  return (
    <Card level="sm" className="border-border gap-3 rounded-3xl border p-4">
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-0.5">
          <Text className="text-foreground text-base font-semibold">{incentive.text}</Text>
          <MonoText className="text-muted text-[11px]">
            {incentive.active ? 'live on the guest view' : 'off — guests see no offer'}
          </MonoText>
        </View>
        <Switch
          isSelected={incentive.active}
          onSelectedChange={(active) => setIncentiveActive(active)}
          accessibilityLabel={`Incentive: ${incentive.text}`}
        />
      </View>

      <View className="gap-1">
        <MonoText className="text-muted text-[11px]">
          applies to Station {station?.code ?? '?'} · {station?.name ?? 'unknown station'}
          {station !== undefined && isStale(station) ? ' · station has gone quiet' : ''}
        </MonoText>
        <MonoText className="text-muted text-[11px]">{incentiveAttribution(incentive)}</MonoText>
        <MonoText className="text-muted text-[11px]">
          set here only · never created or changed by the reading service
        </MonoText>
      </View>
    </Card>
  );
}
