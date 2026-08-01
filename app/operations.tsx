import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { AnnounceButton } from '@/components/ops/AnnounceButton';
import { StatusDot } from '@/components/station/StatusDot';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { eventNow, formatAge, toLocalIso } from '@/lib/clock';
import { findDish, findStation, useBonaFlowStore } from '@/lib/store';
import {
  announcementText,
  formatClock,
  incentiveAttribution,
  priorityLabel,
  queueLabel,
  statusLabel,
} from '@/lib/stations';

/**
 * Operations monitor. It reads the same shared store as the staff and guest
 * views, so a confirmed report lands here without anyone touching this screen.
 */
export default function OperationsScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const alerts = useBonaFlowStore((state) => state.alerts);
  const tasks = useBonaFlowStore((state) => state.tasks);
  const event = useBonaFlowStore((state) => state.event);
  const poll = useLivePoll();

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === 'open'),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [tasks, poll.revision],
  );

  const clock = formatClock(toLocalIso(eventNow()));

  return (
    <Screen scroll contentClassName="gap-6 px-5 py-4" edges={['left', 'right']}>
      <View className="gap-1">
        <Text className="text-foreground text-2xl font-semibold">{event.name}</Text>
        <MonoText className="text-muted text-xs">
          {event.venue} · {event.guests} guests · live {clock}
        </MonoText>
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Stations</Text>
        {stations.map((station) => (
          <Card key={station.id} level="sm" className="flex-row items-center gap-4 rounded-3xl p-4">
            <StatusDot status={station.status} size={20} />
            <View className="flex-1 gap-0.5">
              <Text className="text-foreground text-base font-medium">{station.name}</Text>
              <MonoText className="text-muted text-[11px]">
                {statusLabel(station.status)} · queue: {queueLabel(station.queue)} · last update{' '}
                {formatClock(station.lastUpdatedAt)}
              </MonoText>
            </View>
          </Card>
        ))}
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Alerts</Text>
        {alerts.length === 0 ? (
          <Text className="text-muted text-base">No alerts yet.</Text>
        ) : (
          alerts.map((alert) => {
            const station = findStation(stations, alert.stationId);
            const dish = findDish(station, alert.dishId);

            return (
              <Card key={alert.id} level="sm" className="gap-2 rounded-3xl p-4">
                <MonoText className="text-muted text-xs">
                  {formatClock(alert.createdAt)} · priority: {priorityLabel(alert.priority)}
                </MonoText>
                <Text className="text-foreground text-base">{alert.message}</Text>
                <MonoText className="text-muted text-xs">
                  {alert.recommendedAction}
                  {dish === undefined ? '' : ` · ${dish.name}`}
                </MonoText>
                <AnnounceButton text={announcementText(alert)} />
              </Card>
            );
          })
        )}
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Open tasks</Text>
        {openTasks.length === 0 ? (
          <Text className="text-muted text-base">No open tasks.</Text>
        ) : (
          openTasks.map((task) => {
            const station = findStation(stations, task.stationId);
            const dish = findDish(station, task.dishId);

            return (
              <Card key={task.id} level="sm" className="gap-1 rounded-3xl p-4">
                <Text className="text-foreground text-base font-medium">
                  {dish?.name ?? 'Whole station'} · {station?.name ?? 'Unknown station'}
                </Text>
                <MonoText className="text-muted text-xs">
                  priority: {priorityLabel(task.priority)} · age {formatAge(task.createdAt)}
                </MonoText>
              </Card>
            );
          })
        )}
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Incentive</Text>
        {event.incentive === null || !event.incentive.active ? (
          <Text className="text-muted text-base">No incentive is active.</Text>
        ) : (
          <Card level="sm" className="gap-1 rounded-3xl p-4">
            <Text className="text-foreground text-base font-medium">{event.incentive.text}</Text>
            <MonoText className="text-muted text-xs">
              {incentiveAttribution(event.incentive)}
            </MonoText>
            <MonoText className="text-muted text-xs">
              applies to {findStation(stations, event.incentive.appliesToStationId)?.name ?? '—'}
            </MonoText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
