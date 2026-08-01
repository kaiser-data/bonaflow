import { Text, View } from 'react-native';

import { AnnounceButton } from '@/components/ops/AnnounceButton';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { formatAge } from '@/lib/clock';
import { formatClock } from '@/lib/stations';
import type { GuestAnnouncement } from '@/lib/announce';

/**
 * One announcement, written and heard in English and German.
 *
 * The written lines are always here. Speaking them is an extra: if the voice
 * service cannot be reached and no clip is stored on the device, the button says
 * why in one line and the text stays exactly where it was.
 */
export function AnnouncementCard({ announcement }: { announcement: GuestAnnouncement }) {
  return (
    <Card level="sm" className="border-border gap-3 rounded-3xl border p-5">
      <MonoText className="text-muted text-xs">
        {formatClock(announcement.createdAt)} · {formatAge(announcement.createdAt)}
      </MonoText>

      <View className="gap-2">
        <View className="gap-1">
          <MonoText className="text-muted text-[10px] font-semibold">EN</MonoText>
          <Text className="text-foreground text-base">{announcement.en}</Text>
        </View>
        <View className="gap-1">
          <MonoText className="text-muted text-[10px] font-semibold">DE</MonoText>
          <Text className="text-foreground text-base">{announcement.de}</Text>
        </View>
      </View>

      {announcement.incentiveApplied ? (
        <MonoText className="text-muted text-[11px]">
          includes the offer from the event organiser
        </MonoText>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <AnnounceButton text={announcement.en} label="Play English" />
        <AnnounceButton text={announcement.de} label="Auf Deutsch" />
      </View>
    </Card>
  );
}
