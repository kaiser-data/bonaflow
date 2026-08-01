import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gift } from 'lucide-react-native';

import { DishChoice } from '@/components/rate/DishChoice';
import { LeftoverChoice } from '@/components/rate/LeftoverChoice';
import { ReasonChips } from '@/components/rate/ReasonChips';
import { StarInput } from '@/components/rate/StarInput';
import { PermissionNotice } from '@/components/staff/PermissionNotice';
import { HoldToTalkButton } from '@/components/staff/HoldToTalkButton';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { deviceId, ensureDeviceId } from '@/lib/device';
import { interpretGuestRating } from '@/lib/interpretRating';
import { buildTapDraft } from '@/lib/ratings';
import { balanceFor, POINTS_BASE, POINTS_REASON_BONUS, POINTS_VOICE_BONUS } from '@/lib/rewards';
import {
  useBonaFlowStore,
  type AudioAttachment,
  type LeftoverAmount,
  type LeftoverReason,
} from '@/lib/store';
import { colors } from '@/lib/theme';
import { transcribeVoiceNote } from '@/lib/voice';

const MICROPHONE_DENIED =
  'Microphone access is off, so type it or use the buttons below instead. Nothing is lost either way.';

/**
 * Guests rate the bowl they just ate, by speaking.
 *
 * The order on this screen is the order of what matters. Which bowl, then words,
 * then buttons. Speaking is first because the reason food gets left behind is
 * almost never on a list of chips — "the sauce was nice but there was way too
 * much rice" is a sentence, not a category — and it takes a guest five seconds
 * rather than five taps.
 *
 * Nothing here blocks: a denied microphone, a failed transcription and a dead
 * network all end at the same confirmation screen with the fields tappable, and
 * every path stores the same shape of review.
 */
export default function RateScreen() {
  const router = useRouter();
  const stations = useBonaFlowStore((state) => state.stations);
  const ratings = useBonaFlowStore((state) => state.ratings);
  const redemptions = useBonaFlowStore((state) => state.redemptions);
  const startRatingDraft = useBonaFlowStore((state) => state.startRatingDraft);

  const [stationId, setStationId] = useState<string | null>(null);
  const [dishId, setDishId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [leftover, setLeftover] = useState<LeftoverAmount | null>(null);
  const [reasons, setReasons] = useState<readonly LeftoverReason[]>([]);

  useEffect(() => {
    void ensureDeviceId();
  }, []);

  const id = deviceId();
  const balance = balanceFor(ratings, redemptions, id);
  const ratedDishIds = ratings
    .filter((rating) => rating.deviceId === id)
    .map((rating) => rating.dishId);

  const chosen = stationId !== null && dishId !== null;
  const canReviewText = chosen && text.trim().length > 0 && busy === null;
  const canSubmitTaps =
    chosen && busy === null && (score !== null || leftover !== null || reasons.length > 0);

  /** Words, spoken or typed, always go through the reader and then the review screen. */
  const review = async (input: {
    text: string;
    source: 'voice' | 'text';
    audio: AudioAttachment | null;
  }) => {
    if (stationId === null || dishId === null) return;

    setBusy('reading what you said…');
    const { draft, interpretation } = await interpretGuestRating({
      text: input.text,
      stations,
      stationId,
      dishId,
      source: input.source,
      audio: input.audio,
    });
    setBusy(null);
    startRatingDraft(draft, interpretation);
    router.push('/rate-confirm');
  };

  const reviewVoiceNote = async (audio: AudioAttachment) => {
    if (stationId === null || dishId === null) return;

    setBusy('turning your note into words…');
    const transcript = await transcribeVoiceNote(audio);
    setBusy(null);

    if (transcript.ok) {
      await review({ text: transcript.text, source: 'voice', audio });
      return;
    }

    // No transcript. The note is still kept and the fields are tapped instead, so
    // a guest who has already spoken is never asked to start again.
    startRatingDraft(
      { ...buildTapDraft({ stationId, dishId, score, leftover, reasons }), source: 'voice', audio },
      {
        mode: 'keyword',
        summary: '',
        confidence: 0,
        reported: { score: null, leftover: null, reasons: [] },
        suggestedReasons: [],
        inferences: [],
        sentiment: 'unclear',
        kitchenNote: '',
        corrections: [],
        reason: `${transcript.reason} Your note is kept — please fill the fields in below.`,
      },
    );
    router.push('/rate-confirm');
  };

  const submitTaps = () => {
    if (stationId === null || dishId === null) return;
    startRatingDraft(buildTapDraft({ stationId, dishId, score, leftover, reasons }), null);
    router.push('/rate-confirm');
  };

  return (
    <Screen scroll keyboardAvoiding edges={['left', 'right']} contentClassName="gap-8 px-5 py-4">
      <View className="gap-2">
        <Text className="text-foreground text-2xl font-semibold">Which bowl did you have?</Text>
        <MonoText className="text-muted text-xs">
          tell the kitchen what worked and what came back
        </MonoText>
      </View>

      <DishChoice
        stations={stations}
        selectedDishId={dishId}
        ratedDishIds={ratedDishIds}
        onSelect={(nextStationId, nextDishId) => {
          setStationId(nextStationId);
          setDishId(nextDishId);
        }}
      />

      {!chosen ? null : (
        <>
          <View className="gap-3">
            <Text className="text-foreground text-2xl font-semibold">Say it</Text>
            <MonoText className="text-muted text-xs">
              English or German · hold the button while you speak
            </MonoText>

            {notice === null ? null : <PermissionNotice message={notice} />}

            <HoldToTalkButton
              onRecorded={(audio) => void reviewVoiceNote(audio)}
              onUnavailable={() => setNotice(MICROPHONE_DENIED)}
            />

            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Or type it — what was good, what was left?"
              placeholderTextColor={colors.muted}
              className="border-border bg-surface text-foreground rounded-3xl border p-4 text-base"
              style={{ minHeight: 96, textAlignVertical: 'top' }}
              accessibilityLabel="Your review"
            />

            <Touchable
              accessibilityLabel="Review what you wrote"
              accessibilityState={{ disabled: !canReviewText }}
              disabled={!canReviewText}
              onPress={() => void review({ text, source: 'text', audio: null })}
              style={{ minHeight: 56 }}
              className={
                canReviewText
                  ? 'bg-accent items-center justify-center rounded-3xl px-5'
                  : 'bg-surface border-border items-center justify-center rounded-3xl border px-5'
              }
            >
              <Text
                className={
                  canReviewText
                    ? 'text-accent-foreground text-lg font-semibold'
                    : 'text-muted text-lg font-semibold'
                }
              >
                Continue
              </Text>
            </Touchable>

            {busy === null ? null : <MonoText className="text-muted text-xs">{busy}</MonoText>}
          </View>

          <View className="border-separator gap-5 border-t pt-6">
            <View className="gap-1">
              <Text className="text-foreground text-lg font-semibold">Or just tap</Text>
              <MonoText className="text-muted text-xs">
                no words needed · works with the microphone off
              </MonoText>
            </View>

            <StarInput value={score} onChange={setScore} />
            <LeftoverChoice value={leftover} onChange={setLeftover} />
            <ReasonChips value={reasons} onChange={setReasons} />

            <Touchable
              accessibilityLabel="Continue with these answers"
              accessibilityState={{ disabled: !canSubmitTaps }}
              disabled={!canSubmitTaps}
              onPress={submitTaps}
              style={{ minHeight: 56 }}
              className={
                canSubmitTaps
                  ? 'border-foreground items-center justify-center rounded-3xl border px-5'
                  : 'border-border items-center justify-center rounded-3xl border px-5'
              }
            >
              <Text
                className={
                  canSubmitTaps
                    ? 'text-foreground text-lg font-semibold'
                    : 'text-muted text-lg font-semibold'
                }
              >
                Continue
              </Text>
            </Touchable>
          </View>
        </>
      )}

      <Card level="sm" className="gap-3 rounded-3xl p-4">
        <View className="flex-row items-center gap-2">
          <Gift color={colors.foreground} size={18} />
          <Text className="text-foreground text-base font-semibold">
            {balance} {balance === 1 ? 'point' : 'points'}
          </Text>
        </View>
        <MonoText className="text-muted text-[11px]">
          {POINTS_BASE} for a rating · {POINTS_REASON_BONUS} more for saying why ·{' '}
          {POINTS_VOICE_BONUS} more for speaking it
        </MonoText>
        <Touchable
          accessibilityLabel="See what your points can get"
          onPress={() => router.push('/rewards')}
          className="border-border bg-background items-center justify-center self-start rounded-2xl border px-4"
        >
          <Text className="text-foreground text-sm font-semibold">See rewards</Text>
        </Touchable>
      </Card>
    </Screen>
  );
}
