import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { AnnouncementCard } from '@/components/guest/AnnouncementCard';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { announcementsForAlerts } from '@/lib/announce';
import { useBonaFlowStore } from '@/lib/store';
import { prewarmAnnouncement } from '@/lib/voice';

/**
 * Guest announcements.
 *
 * Each line is written here by code from the station, the dish's declared dietary
 * tag and the redirection the app has verified — a model never writes what a
 * guest reads or hears. When operations has an incentive running for the station
 * guests are sent to, its wording is appended as one short clause.
 */
export default function UpdatesScreen() {
  const alerts = useBonaFlowStore((state) => state.alerts);
  const updates = useBonaFlowStore((state) => state.updates);
  const stations = useBonaFlowStore((state) => state.stations);
  const event = useBonaFlowStore((state) => state.event);
  const poll = useLivePoll();

  const announcements = useMemo(
    () =>
      announcementsForAlerts({
        alerts,
        updates,
        stations,
        incentive: event.incentive,
      }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [alerts, updates, stations, event.incentive, poll.revision],
  );

  const newest = announcements.length > 0 ? announcements[0] : null;
  const newestEn = newest?.en ?? '';
  const newestDe = newest?.de ?? '';

  // The newest pair is generated as soon as it appears, so pressing play on stage
  // reads a clip off the device instead of waiting for a round trip.
  useEffect(() => {
    if (newestEn.length === 0) return;
    void (async () => {
      await prewarmAnnouncement(newestEn);
      await prewarmAnnouncement(newestDe);
    })();
  }, [newestEn, newestDe]);

  return (
    <Screen scroll edges={['left', 'right']} contentClassName="gap-4 px-5 py-4">
      <View className="gap-1">
        <Text className="text-foreground text-lg font-semibold">Announcements</Text>
        <MonoText className="text-muted text-[11px]">
          English and German · text stays here if the audio cannot play
        </MonoText>
      </View>

      {announcements.length === 0 ? (
        <Text className="text-muted text-base">
          No announcements yet. They appear here as soon as a station reports a change.
        </Text>
      ) : (
        announcements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))
      )}
    </Screen>
  );
}
