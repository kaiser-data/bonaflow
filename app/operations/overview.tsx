import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { IncentiveToggle } from '@/components/ops/IncentiveToggle';
import { OpsStationRow } from '@/components/ops/OpsStationRow';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { eventNow, formatAge, toLocalIso } from '@/lib/clock';
import { findDish, findStation, useBonaFlowStore } from '@/lib/store';
import {
  DIET_FILTERS,
  dietTagLabel,
  formatClock,
  mostCrowdedStation,
  queueDescriptor,
  STALE_AFTER_MINUTES,
  verifyRedirect,
} from '@/lib/stations';

/**
 * Operations overview.
 *
 * Every station, what it holds, what is running out and when it last spoke — plus
 * the busiest station and where guests should be sent instead. The redirection is
 * the same deterministic rule the guest For You tab uses, so what operations
 * reads on stage is what the guests' phones are already showing.
 */
export default function OperationsOverviewScreen() {
  const event = useBonaFlowStore((state) => state.event);
  const stations = useBonaFlowStore((state) => state.stations);
  const recommendations = useBonaFlowStore((state) => state.recommendations);
  const lastSyncedAt = useBonaFlowStore((state) => state.lastSyncedAt);
  const poll = useLivePoll();

  const crowded = useMemo(
    () => mostCrowdedStation(stations),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [stations, poll.revision],
  );

  // Away from the busiest station, to a station that plain code has confirmed
  // still has something available. No model is involved in this line.
  const redirect = useMemo(
    () =>
      crowded === null
        ? null
        : verifyRedirect({
            stations,
            awayFromStationId: crowded.id,
            dish: null,
            suggestedStationId: null,
          }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [crowded, stations, poll.revision],
  );

  const clock = formatClock(toLocalIso(eventNow()));

  return (
    <Screen scroll edges={['left', 'right']} contentClassName="gap-6 px-5 py-4">
      <View className="gap-1">
        <Text className="text-foreground text-2xl font-semibold">{event.name}</Text>
        <MonoText className="text-muted text-xs">
          {event.venue} · {event.guests} guests · live {clock}
        </MonoText>
        <MonoText className="text-muted text-[11px]">
          {lastSyncedAt === null
            ? 'no answer from the event server yet · showing the state held on this device'
            : `synced ${formatClock(lastSyncedAt)} · ${formatAge(lastSyncedAt)} ago · refreshes every 3 s`}
        </MonoText>
      </View>

      <IncentiveToggle />

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Recommended redirection</Text>
        {crowded === null ? (
          <Card level="sm" className="border-border rounded-3xl border p-4">
            <Text className="text-muted text-base">
              No station has reported a queue level yet, so there is nothing to redirect.
            </Text>
          </Card>
        ) : redirect === null ? (
          <Card level="sm" className="border-border gap-1 rounded-3xl border p-4">
            <Text className="text-foreground text-base">
              Station {crowded.code} is the busiest, and no other station has an available dish.
            </Text>
            <MonoText className="text-muted text-[11px]">
              nowhere to send guests · this is what the guest view says too
            </MonoText>
          </Card>
        ) : (
          <Card level="sm" className="border-border gap-2 rounded-3xl border p-4">
            <Text className="text-foreground text-lg font-semibold">
              Station {crowded.code} → Station {redirect.station.code}
            </Text>
            <Text className="text-foreground text-base">
              {redirect.dish.name} at {redirect.station.name}
            </Text>
            <MonoText className="text-muted text-[11px]">
              {queueDescriptor(redirect.station.queue)} · available ·{' '}
              {redirect.source === 'rule'
                ? 'chosen by the deterministic rule'
                : 'suggestion verified'}
            </MonoText>

            <View className="border-separator gap-1 border-t pt-3">
              <MonoText className="text-muted text-[10px] font-semibold">
                BY DIETARY FILTER — DECLARED TAGS ONLY
              </MonoText>
              {DIET_FILTERS.map(({ value }) => {
                const reference = recommendations[value];
                const station = findStation(stations, reference?.stationId ?? null);
                const dish = findDish(station, reference?.dishId ?? null);

                return (
                  <MonoText key={value} className="text-muted text-[11px]">
                    {value === 'all' ? 'any diet' : dietTagLabel(value)} →{' '}
                    {station === undefined || dish === undefined
                      ? 'nothing available'
                      : `Station ${station.code} · ${dish.name}`}
                  </MonoText>
                );
              })}
            </View>
          </Card>
        )}
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Stations</Text>
        <MonoText className="text-muted text-[11px]">
          grey means no update for over {STALE_AFTER_MINUTES} min · a quiet station is never shown
          as available
        </MonoText>
        {stations.map((station) => (
          <OpsStationRow
            key={station.id}
            station={station}
            isMostCrowded={crowded !== null && station.id === crowded.id}
          />
        ))}
      </View>
    </Screen>
  );
}
