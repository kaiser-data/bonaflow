import { Text } from 'react-native';

import { PhotoEvidence } from '@/components/ops/PhotoEvidence';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { describeAttachment } from '@/lib/audio';
import { formatAge } from '@/lib/clock';
import { OFFLINE_INTERPRETATION_LABEL } from '@/lib/interpret';
import {
  actionLabel,
  availabilityLabel,
  formatClock,
  priorityLabel,
  queueLabel,
} from '@/lib/stations';
import {
  findDish,
  findStation,
  type ReportSource,
  type StaffUpdate,
  type Station,
} from '@/lib/store';

const SOURCE_LABELS: Record<ReportSource, string> = {
  quick_action: 'quick action',
  text: 'typed',
  voice: 'voice note',
  manual_override: 'manual override',
};

/**
 * One staff report in the activity feed, with the words it arrived as.
 *
 * The transcript is kept verbatim: a voice note's words are the record, and the
 * fields below it are what was applied after the staff member confirmed them.
 */
export function ActivityRow({
  update,
  stations,
}: {
  update: StaffUpdate;
  stations: readonly Station[];
}) {
  const station = findStation(stations, update.stationId);
  const dish = findDish(station, update.dishId);
  const interpretation = update.interpretation;

  const applied: string[] = [];
  if (update.availability !== null) {
    applied.push(`availability ${availabilityLabel(update.availability)}`);
  }
  if (update.queue !== null) applied.push(`queue ${queueLabel(update.queue)}`);
  if (update.guestsWaiting !== null) applied.push(`${update.guestsWaiting} guests waiting`);
  applied.push(`${actionLabel(update.action)} · priority ${priorityLabel(update.priority)}`);

  return (
    <Card level="sm" className="border-border gap-2 rounded-3xl border p-4">
      <MonoText className="text-muted text-[11px]">
        {formatClock(update.createdAt)} · {formatAge(update.createdAt)} ·{' '}
        {SOURCE_LABELS[update.source]}
      </MonoText>

      <Text className="text-foreground text-base font-semibold">
        Station {station?.code ?? '?'} · {dish?.name ?? 'whole station'}
      </Text>

      {update.note.trim().length === 0 ? (
        <MonoText className="text-muted text-[11px]">
          no words attached · reported by tapping
        </MonoText>
      ) : (
        <Text className="text-foreground text-sm">“{update.note.trim()}”</Text>
      )}

      <MonoText className="text-muted text-[11px]">applied: {applied.join(' · ')}</MonoText>

      {update.audio === null ? null : (
        <MonoText className="text-muted text-[11px]">{describeAttachment(update.audio)}</MonoText>
      )}

      {interpretation === null ? null : (
        <MonoText className="text-muted text-[11px]">
          {interpretation.mode === 'keyword'
            ? OFFLINE_INTERPRETATION_LABEL
            : `read by the reading service · ${Math.round(interpretation.confidence * 100)}% confident`}
        </MonoText>
      )}

      {update.photoUri === null ? null : <PhotoEvidence uri={update.photoUri} />}
    </Card>
  );
}
