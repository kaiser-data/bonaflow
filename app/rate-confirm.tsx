import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { LeftoverChoice } from '@/components/rate/LeftoverChoice';
import { RatingInterpretationCard } from '@/components/rate/RatingInterpretationCard';
import { ReasonChips } from '@/components/rate/ReasonChips';
import { StarInput } from '@/components/rate/StarInput';
import { DishPhoto } from '@/components/station/DishPhoto';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { describeAttachment } from '@/lib/audio';
import { deviceId } from '@/lib/device';
import { keyboardDismissMode } from '@/lib/platform';
import { pointsBreakdown, pointsFor } from '@/lib/rewards';
import { findDish, findStation, useBonaFlowStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/**
 * The guest checks their own review before it is stored.
 *
 * Nothing reaches the shared data until Submit is pressed here. Every field is
 * editable, including the ones the reading service filled in, and the card above
 * them says which of those were heard and which were worked out. A guest is never
 * shown a score they did not give as though they had given it.
 *
 * Send and Discard sit in a bar fixed to the bottom rather than at the end of the
 * page: a guest who is happy with what they see should be able to send it without
 * scrolling past fields they do not intend to change.
 */
export default function RateConfirmScreen() {
  const router = useRouter();
  const draft = useBonaFlowStore((state) => state.ratingDraft);
  const interpretation = useBonaFlowStore((state) => state.ratingInterpretation);
  const stations = useBonaFlowStore((state) => state.stations);
  const ratings = useBonaFlowStore((state) => state.ratings);
  const patchRatingDraft = useBonaFlowStore((state) => state.patchRatingDraft);
  const clearRatingDraft = useBonaFlowStore((state) => state.clearRatingDraft);
  const commitRatingDraft = useBonaFlowStore((state) => state.commitRatingDraft);

  if (draft === null) {
    return (
      <Screen edges={['left', 'right', 'bottom']} contentClassName="gap-4 px-5 py-6">
        <Text className="text-foreground text-lg font-medium">
          This review is no longer open. Start again from the Rate tab.
        </Text>
      </Screen>
    );
  }

  const station = findStation(stations, draft.stationId);
  const dish = findDish(station, draft.dishId);

  const id = deviceId();
  const points = pointsFor({
    deviceId: id,
    dishId: draft.dishId,
    source: draft.source,
    reasons: draft.reasons,
    ratings,
  });
  const breakdown = pointsBreakdown({
    deviceId: id,
    dishId: draft.dishId,
    source: draft.source,
    reasons: draft.reasons,
    ratings,
  });

  const submit = () => {
    commitRatingDraft();
    router.replace('/rewards');
  };

  const cancel = () => {
    clearRatingDraft();
    router.back();
  };

  return (
    // The header supplies the top inset; the action bar owns the bottom one.
    <Screen keyboardAvoiding edges={['left', 'right']} contentClassName="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5 px-5 py-3">
          {dish === undefined ? null : (
            <View className="flex-row items-center gap-3">
              <DishPhoto image={dish.image} name={dish.name} />
              <View className="flex-1 gap-0.5">
                <Text className="text-foreground text-base font-semibold">{dish.name}</Text>
                <MonoText className="text-muted text-[11px]">{station?.name ?? ''}</MonoText>
              </View>
            </View>
          )}

          {interpretation === null ? null : (
            <RatingInterpretationCard
              interpretation={interpretation}
              spoken={draft.audio !== null}
            />
          )}

          <StarInput
            value={draft.score}
            onChange={(score) => patchRatingDraft({ score })}
            reported={
              interpretation?.reported.score !== null &&
              interpretation?.reported.score === draft.score
            }
          />

          <LeftoverChoice
            value={draft.leftover}
            onChange={(leftover) => patchRatingDraft({ leftover })}
          />

          <ReasonChips
            value={draft.reasons}
            onChange={(reasons) => patchRatingDraft({ reasons })}
            suggested={interpretation?.suggestedReasons ?? []}
          />

          <View className="gap-2">
            <Text className="text-muted text-xs font-semibold uppercase">Your words</Text>
            <TextInput
              value={draft.comment}
              onChangeText={(comment) => patchRatingDraft({ comment })}
              multiline
              placeholder="Anything else the kitchen should know?"
              placeholderTextColor={colors.muted}
              className="border-border bg-surface text-foreground rounded-3xl border px-4 py-3 text-base"
              style={{ minHeight: 72, textAlignVertical: 'top' }}
              accessibilityLabel="Your words"
            />
            <MonoText className="text-muted text-[11px]">
              kept exactly as you wrote it{draft.language === 'de' ? ' · German' : ''}
            </MonoText>
          </View>

          {draft.audio === null ? null : (
            <Card level="sm" className="gap-1 rounded-3xl p-4">
              <MonoText className="text-muted text-[11px]">
                {describeAttachment(draft.audio)}
              </MonoText>
              <Text className="text-muted text-xs">
                Your recording is kept with these words so the kitchen can listen to it later. It is
                filed against this phone, never a name, and it is only sent when you press the
                button below.
              </Text>
            </Card>
          )}

          <Text className="text-muted text-xs">
            Stored against this phone, not your name. Nothing is sent until you press Send.
          </Text>
        </View>
      </ScrollView>

      <View className="border-border bg-background pb-safe-offset-3 gap-3 border-t px-5 pt-3">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-foreground text-sm font-semibold">
            {points === 0 ? 'No points for this one' : `+${points} points`}
          </Text>
          <MonoText className="text-muted flex-1 text-right text-[11px]" numberOfLines={1}>
            {breakdown}
          </MonoText>
        </View>

        <View className="flex-row gap-3">
          <Touchable
            accessibilityLabel="Discard this review"
            onPress={cancel}
            style={{ minHeight: 56, flexGrow: 0 }}
            className="border-border items-center justify-center rounded-3xl border px-5"
          >
            <Text className="text-foreground text-base font-semibold">Discard</Text>
          </Touchable>

          <Touchable
            accessibilityLabel="Send this review to the kitchen"
            onPress={submit}
            style={{ minHeight: 56, flex: 1 }}
            className="bg-accent items-center justify-center rounded-3xl px-5"
          >
            <Text className="text-accent-foreground text-lg font-semibold">Send</Text>
          </Touchable>
        </View>
      </View>
    </Screen>
  );
}
