import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { StatusDot } from '@/components/station/StatusDot';
import { formatAge } from '@/lib/clock';
import {
  dishesByAvailability,
  displayStatus,
  formatClock,
  isStale,
  queueLabel,
  statusLabel,
} from '@/lib/stations';
import type { Dish, Station } from '@/lib/store';

export type OpsStationRowProps = {
  station: Station;
  /** The busiest station on the floor right now. */
  isMostCrowded: boolean;
};

function names(dishes: readonly Dish[]): string {
  if (dishes.length === 0) return '—';
  return dishes.map((dish) => dish.name).join(', ');
}

/**
 * One station as operations sees it: status, queue, what is on the counter, what
 * is running out, and when it last reported.
 *
 * A station that has gone quiet is shown grey and says so. Its last known status
 * is never repeated as if it were current, because a green dot on a station
 * nobody has heard from is the one thing that would send guests the wrong way.
 */
export function OpsStationRow({ station, isMostCrowded }: OpsStationRowProps) {
  const status = displayStatus(station);
  const stale = isStale(station);
  const available = dishesByAvailability(station, 'available');
  const low = dishesByAvailability(station, 'low');
  const soldOut = dishesByAvailability(station, 'sold_out');

  return (
    <Card
      level="sm"
      className={
        isMostCrowded
          ? 'border-accent gap-3 rounded-3xl border-2 p-4'
          : 'border-border gap-3 rounded-3xl border p-4'
      }
    >
      <View className="flex-row items-center gap-3">
        <StatusDot status={status} size={18} />
        <View className="flex-1 gap-0.5">
          <Text className="text-foreground text-base font-semibold">
            Station {station.code} · {station.name}
          </Text>
          <MonoText className="text-muted text-[11px]">
            {statusLabel(status)} · queue {queueLabel(station.queue)} · {station.location}
          </MonoText>
        </View>
        {isMostCrowded ? (
          <View className="bg-accent rounded-full px-2.5 py-1">
            <MonoText className="text-accent-foreground text-[10px] font-semibold">
              most crowded
            </MonoText>
          </View>
        ) : null}
      </View>

      <View className="gap-1">
        <MonoText className="text-foreground text-[11px]">available: {names(available)}</MonoText>
        <MonoText className="text-muted text-[11px]">low stock: {names(low)}</MonoText>
        {soldOut.length === 0 ? null : (
          <MonoText className="text-muted text-[11px]">sold out: {names(soldOut)}</MonoText>
        )}
      </View>

      <MonoText className="text-muted text-[11px]">
        {stale ? 'no update since' : 'last update'} {formatClock(station.lastUpdatedAt)} ·{' '}
        {formatAge(station.lastUpdatedAt)}
        {stale ? ' — shown grey, not green' : ''}
      </MonoText>
    </Card>
  );
}
