import { Text, View } from 'react-native';

import { MonoText } from '@/components/ui/MonoText';
import { availabilityLabel, queueLabel } from '@/lib/stations';
import type { StaffUpdate } from '@/lib/store';

/**
 * What was reported and what was concluded, as two separate blocks that never
 * merge. The reported block holds the staff member's own words and the fields
 * they actually said; the inference block holds everything the reading service
 * worked out, each line carrying its own confidence and the words behind it.
 *
 * A report applied by a quick action or by the manual override was never read by
 * anything, and says so, rather than showing an empty inference list as if a
 * service had been involved.
 */

const FIELD_LABELS: Record<string, string> = {
  availability: 'availability',
  queue: 'queue',
  guestsWaiting: 'guests waiting',
  action: 'action',
  priority: 'priority',
  dish: 'dish',
  station: 'station',
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function ReadingRows({ update }: { update: StaffUpdate }) {
  const interpretation = update.interpretation;
  const facts = interpretation?.facts ?? null;

  const reported: string[] = [];
  if (facts === null) {
    if (update.availability !== null) {
      reported.push(`availability ${availabilityLabel(update.availability)}`);
    }
    if (update.queue !== null) reported.push(`queue ${queueLabel(update.queue)}`);
  } else {
    if (facts.availability !== null) {
      reported.push(`availability ${availabilityLabel(facts.availability)}`);
    }
    if (facts.queue !== null) reported.push(`queue ${queueLabel(facts.queue)}`);
    if (facts.stationClosed) reported.push('station closed');
    if (facts.stationReopened) reported.push('station open again');
  }
  if (update.guestsWaiting !== null) reported.push(`${update.guestsWaiting} guests waiting`);

  return (
    <View className="gap-2">
      <View className="border-border bg-default gap-1 rounded-2xl border p-3">
        <MonoText className="text-foreground text-[10px] font-semibold">REPORTED</MonoText>
        {update.note.trim().length === 0 ? null : (
          <Text className="text-foreground text-sm">“{update.note.trim()}”</Text>
        )}
        <MonoText className="text-muted text-[11px]">
          {reported.length === 0 ? 'no fields were stated outright' : reported.join(' · ')}
        </MonoText>
      </View>

      <View
        className="border-separator gap-1 rounded-2xl border p-3"
        style={{ borderStyle: 'dashed' }}
      >
        <MonoText className="text-muted text-[10px] font-semibold">AI INFERENCE</MonoText>
        {interpretation === null ? (
          <MonoText className="text-muted text-[11px]">
            nothing was inferred — applied exactly as tapped
          </MonoText>
        ) : interpretation.inferences.length === 0 ? (
          <MonoText className="text-muted text-[11px]">
            nothing was inferred — every field was stated
          </MonoText>
        ) : (
          interpretation.inferences.map((inference) => (
            <MonoText
              key={`${inference.field}-${inference.value}`}
              className="text-muted text-[11px]"
            >
              {fieldLabel(inference.field)} {inference.value} ·{' '}
              {Math.round(inference.confidence * 100)}% confident
              {inference.basis.length === 0 ? '' : ` · from “${inference.basis}”`}
            </MonoText>
          ))
        )}
      </View>
    </View>
  );
}
