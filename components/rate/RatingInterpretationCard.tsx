import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Disclosure } from '@/components/ui/Disclosure';
import { MonoText } from '@/components/ui/MonoText';
import { leftoverLabel, reasonLabel } from '@/lib/ratings';
import type { RatingInterpretation } from '@/lib/store';

export type RatingInterpretationCardProps = {
  interpretation: RatingInterpretation;
  /** True when the words came from a voice note rather than the keyboard. */
  spoken: boolean;
};

/**
 * What was heard, kept apart from what was concluded.
 *
 * The first block is only what the guest said. The second is everything the
 * reading service worked out, each line with its own confidence and the words it
 * came from. They never merge into one list, because a guest correcting their own
 * review needs to know which of these two things they are correcting.
 */
export function RatingInterpretationCard({
  interpretation,
  spoken,
}: RatingInterpretationCardProps) {
  const { reported } = interpretation;
  const saidNothing =
    reported.score === null && reported.leftover === null && reported.reasons.length === 0;

  return (
    <Card level="sm" className="gap-4 rounded-3xl p-4">
      <View className="gap-1">
        <MonoText className="text-muted text-[11px]">
          {interpretation.mode === 'model' ? 'read by the service' : 'read on this phone'}
          {interpretation.mode === 'model' && interpretation.confidence > 0
            ? ` · confidence ${interpretation.confidence.toFixed(2)}`
            : ''}
        </MonoText>
        {interpretation.summary.length === 0 ? null : (
          <Text className="text-foreground text-base">{interpretation.summary}</Text>
        )}
        {interpretation.reason === null ? null : (
          <MonoText className="text-foreground text-[11px]">{interpretation.reason}</MonoText>
        )}
      </View>

      <View className="border-separator gap-1 border-t pt-3">
        <MonoText className="text-muted text-[11px]">You said:</MonoText>
        {saidNothing ? (
          <Text className="text-muted text-sm">
            Nothing that could be turned into a field — the words are kept as they are.
          </Text>
        ) : (
          <View className="gap-0.5">
            {reported.score === null ? null : (
              <Text className="text-foreground text-sm">{reported.score} of 5</Text>
            )}
            {reported.leftover === null ? null : (
              <Text className="text-foreground text-sm">{leftoverLabel(reported.leftover)}</Text>
            )}
            {reported.reasons.map((reason) => (
              <Text key={reason} className="text-foreground text-sm">
                {reasonLabel(reason)}
              </Text>
            ))}
          </View>
        )}
      </View>

      {interpretation.inferences.length === 0 ? null : (
        <View className="border-separator border-t pt-3">
          <Disclosure
            tone="note"
            title="Worked out, not said"
            hint={`${interpretation.inferences.length} ${interpretation.inferences.length === 1 ? 'field' : 'fields'} · tap to check them`}
          >
            {interpretation.inferences.map((inference) => (
              <View
                key={`${inference.field}-${inference.value}-${inference.basis}`}
                className="gap-0.5"
              >
                <Text className="text-foreground text-sm">
                  {inference.field}: {inference.value}
                </Text>
                <MonoText className="text-muted text-[10px]">
                  confidence {inference.confidence.toFixed(2)}
                  {inference.basis.length === 0 ? '' : ` · from “${inference.basis}”`}
                </MonoText>
              </View>
            ))}
          </Disclosure>
        </View>
      )}

      {interpretation.corrections.length === 0 && interpretation.kitchenNote.length === 0 ? null : (
        <View className="border-separator border-t pt-3">
          <Disclosure tone="note" title="corrections and the note for the kitchen">
            {interpretation.corrections.map((correction) => (
              <Text key={correction} className="text-muted text-xs">
                corrected before you saw it: {correction}
              </Text>
            ))}
            {interpretation.kitchenNote.length === 0 ? null : (
              <Text className="text-foreground text-sm">
                {interpretation.kitchenNote}
                <Text className="text-muted text-xs"> — not shown to other guests</Text>
              </Text>
            )}
          </Disclosure>
        </View>
      )}

      {spoken ? (
        <MonoText className="text-muted text-[10px]">
          your voice note is kept with this review as evidence for the team
        </MonoText>
      ) : null}
    </Card>
  );
}
