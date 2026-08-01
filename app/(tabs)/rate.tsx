import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, type ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Gift } from 'lucide-react-native';

import { DishChoice } from '@/components/rate/DishChoice';
import { LeftoverChoice } from '@/components/rate/LeftoverChoice';
import { ReasonChips } from '@/components/rate/ReasonChips';
import { StarInput } from '@/components/rate/StarInput';
import { PermissionNotice } from '@/components/staff/PermissionNotice';
import { HoldToTalkButton } from '@/components/staff/HoldToTalkButton';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { deviceId, ensureDeviceId } from '@/lib/device';
import { interpretGuestRating } from '@/lib/interpretRating';
import { buildTapDraft } from '@/lib/ratings';
import { balanceFor } from '@/lib/rewards';
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

/** Which part of the screen the guest should be looking at next. */
type ScrollTarget = 'mic' | 'taps';

/**
 * Guests rate the bowl they just ate, by speaking.
 *
 * The screen is one step at a time rather than one long page. The bowl grid
 * collapses to a single line the moment a bowl is picked, which lifts the
 * microphone above the fold, and the screen scrolls itself there — a guest
 * standing with a tray should never have to scroll to find the thing they are
 * meant to do next. Typing and the button-only path are kept, both revealed only
 * when they are wanted, so neither adds height to the default flow.
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
  const ratingTarget = useBonaFlowStore((state) => state.ratingTarget);
  const clearRatingTarget = useBonaFlowStore((state) => state.clearRatingTarget);

  const [stationId, setStationId] = useState<string | null>(null);
  const [dishId, setDishId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [leftover, setLeftover] = useState<LeftoverAmount | null>(null);
  const [reasons, setReasons] = useState<readonly LeftoverReason[]>([]);
  const [tapsOpen, setTapsOpen] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<ScrollTarget | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    void ensureDeviceId();
  }, []);

  /** A bowl tapped on the stations list or the recommendation opens straight into its review. */
  useEffect(() => {
    if (ratingTarget === null) return;

    setStationId(ratingTarget.stationId);
    setDishId(ratingTarget.dishId);
    setText('');
    setScore(null);
    setLeftover(null);
    setReasons([]);
    setTapsOpen(false);
    setPendingScroll('mic');
    clearRatingTarget();
  }, [ratingTarget, clearRatingTarget]);

  const id = deviceId();
  const balance = balanceFor(ratings, redemptions, id);
  const ratedDishIds = ratings
    .filter((rating) => rating.deviceId === id)
    .map((rating) => rating.dishId);

  const chosen = stationId !== null && dishId !== null;
  const typed = text.trim().length > 0;
  const canReviewText = chosen && typed && busy === null;
  const canSubmitTaps =
    chosen && busy === null && (score !== null || leftover !== null || reasons.length > 0);

  /** Move the screen to the step that just appeared, once it knows where it is. */
  const settleScroll = (target: ScrollTarget, y: number) => {
    if (pendingScroll !== target) return;
    setPendingScroll(null);
    scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
  };

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
    <Screen
      scroll
      scrollRef={scrollRef}
      keyboardAvoiding
      edges={['left', 'right']}
      contentClassName="gap-5 px-5 py-3"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-foreground text-2xl font-semibold">
            {chosen ? 'How was it?' : 'Which bowl did you have?'}
          </Text>
          <MonoText className="text-muted text-xs">
            {chosen
              ? 'hold the button and say it · five seconds is plenty'
              : 'tap the photo of the bowl you just ate'}
          </MonoText>
        </View>

        <Touchable
          accessibilityLabel={`${balance} points. See what they can get`}
          onPress={() => router.push('/rewards')}
          className="border-border bg-surface flex-none flex-row items-center gap-1.5 rounded-full border px-3"
        >
          <Gift color={colors.foreground} size={14} />
          <Text className="text-foreground text-sm font-semibold">{balance}</Text>
        </Touchable>
      </View>

      <DishChoice
        stations={stations}
        selectedDishId={dishId}
        ratedDishIds={ratedDishIds}
        onSelect={(nextStationId, nextDishId) => {
          setStationId(nextStationId);
          setDishId(nextDishId);
          setPendingScroll('mic');
        }}
        onChange={() => {
          setDishId(null);
          setStationId(null);
          setTapsOpen(false);
        }}
      />

      {!chosen ? null : (
        <>
          <View
            className="gap-3"
            onLayout={(event) => settleScroll('mic', event.nativeEvent.layout.y)}
          >
            {notice === null ? null : <PermissionNotice message={notice} />}

            <HoldToTalkButton
              onRecorded={(audio) => void reviewVoiceNote(audio)}
              onUnavailable={() => setNotice(MICROPHONE_DENIED)}
            />

            {busy === null ? null : <MonoText className="text-muted text-xs">{busy}</MonoText>}

            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Or type it — what was good, what was left?"
              placeholderTextColor={colors.muted}
              className="border-border bg-surface text-foreground rounded-3xl border px-4 py-3 text-base"
              style={{ minHeight: 72, textAlignVertical: 'top' }}
              accessibilityLabel="Your review"
            />

            {/* The button appears with the words, so an empty screen never carries a dead control. */}
            {!typed ? null : (
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
            )}
          </View>

          <View
            className="border-separator gap-4 border-t pt-4"
            onLayout={(event) => settleScroll('taps', event.nativeEvent.layout.y)}
          >
            <Touchable
              accessibilityLabel={tapsOpen ? 'Hide the buttons' : 'Rate with buttons instead'}
              accessibilityState={{ expanded: tapsOpen }}
              onPress={() => {
                const next = !tapsOpen;
                setTapsOpen(next);
                setPendingScroll(next ? 'taps' : null);
              }}
              className="flex-row items-center justify-between gap-3"
            >
              <View className="flex-1 gap-0.5">
                <Text className="text-foreground text-base font-semibold">
                  Rather not talk? Use the buttons
                </Text>
                <MonoText className="text-muted text-[11px]">
                  stars, how much was left, why · works with the microphone off
                </MonoText>
              </View>
              {tapsOpen ? (
                <ChevronUp color={colors.foreground} size={18} />
              ) : (
                <ChevronDown color={colors.foreground} size={18} />
              )}
            </Touchable>

            {!tapsOpen ? null : (
              <View className="gap-5">
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
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
