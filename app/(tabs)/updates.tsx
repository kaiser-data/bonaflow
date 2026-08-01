import { useMemo } from 'react';
import { Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useBonaFlowStore } from '@/lib/store';
import { formatClock, sortAnnouncements } from '@/lib/stations';

export default function UpdatesScreen() {
  const announcements = useBonaFlowStore((state) => state.announcements);

  const ordered = useMemo(() => sortAnnouncements(announcements), [announcements]);

  return (
    <Screen scroll edges={['left', 'right']} contentClassName="gap-4 px-5 py-4">
      {ordered.length === 0 ? (
        <Text className="text-muted text-base">No announcements yet.</Text>
      ) : (
        ordered.map((announcement) => (
          <Card key={announcement.id} level="sm" className="gap-2 rounded-3xl p-5">
            <MonoText className="text-muted text-xs">
              {formatClock(announcement.createdAt)}
            </MonoText>
            <Text className="text-foreground text-base">{announcement.body}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
