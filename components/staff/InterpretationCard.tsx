import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { OFFLINE_INTERPRETATION_LABEL, type DraftInterpretation } from '@/lib/interpret';
import { availabilityLabel, queueLabel } from '@/lib/stations';

/**
 * Says how the report was read, and keeps what was heard apart from what was
 * concluded. Every inference carries its confidence and the words it came from,
 * so the staff member can tell the two apart before confirming.
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

export function InterpretationCard({
  interpretation,
  photoAttached,
}: {
  interpretation: DraftInterpretation;
  photoAttached: boolean;
}) {
  const { facts } = interpretation;

  const heard: string[] = [];
  if (facts !== null) {
    if (facts.availability !== null)
      heard.push(`availability ${availabilityLabel(facts.availability)}`);
    if (facts.queue !== null) heard.push(`queue ${queueLabel(facts.queue)}`);
    if (facts.stationClosed) heard.push('station closed');
    if (facts.stationReopened) heard.push('station open again');
  }

  return (
    <Card level="sm" className="gap-2 rounded-3xl p-4">
      {interpretation.mode === 'keyword' ? (
        <>
          <MonoText className="text-foreground text-xs">{OFFLINE_INTERPRETATION_LABEL}</MonoText>
          {interpretation.reason === null ? null : (
            <Text className="text-muted text-sm">{interpretation.reason}</Text>
          )}
        </>
      ) : (
        <MonoText className="text-muted text-xs">read from what you said</MonoText>
      )}

      {interpretation.summary.length === 0 ? null : (
        <Text className="text-foreground text-base">{interpretation.summary}</Text>
      )}

      {heard.length === 0 ? null : (
        <MonoText className="text-foreground text-xs">Reported: {heard.join(' · ')}</MonoText>
      )}

      {interpretation.inferences.length === 0 ? null : (
        <View className="gap-1 pt-1">
          <MonoText className="text-muted text-xs">Worked out, not said:</MonoText>
          {interpretation.inferences.map((inference) => (
            <MonoText key={`${inference.field}-${inference.value}`} className="text-muted text-xs">
              {fieldLabel(inference.field)} {inference.value} ·{' '}
              {Math.round(inference.confidence * 100)}% confident
              {inference.basis.length === 0 ? '' : ` · from “${inference.basis}”`}
            </MonoText>
          ))}
        </View>
      )}

      {interpretation.corrections.length === 0
        ? null
        : interpretation.corrections.map((correction) => (
            <MonoText key={correction} className="text-muted text-xs">
              corrected: {correction}
            </MonoText>
          ))}

      {photoAttached ? (
        <MonoText className="text-muted text-xs">
          The tray photo stays with this update as evidence for the team. It was not used to read
          these fields.
        </MonoText>
      ) : null}
    </Card>
  );
}
