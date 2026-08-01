import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { DishPhoto } from '@/components/station/DishPhoto';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { useLivePoll } from '@/hooks/useLivePoll';
import { formatAge } from '@/lib/clock';
import {
  rankReasons,
  reasonLabel,
  scoreLine,
  summariseFeedback,
  wasteLine,
  type DishFeedback,
} from '@/lib/ratings';
import { formatClock } from '@/lib/stations';
import { useBonaFlowStore } from '@/lib/store';

/**
 * What came back, and why.
 *
 * The dishes with the most left behind come first, because that is the row worth
 * acting on. Two numbers per dish and neither is faked: a dish nobody scored says
 * so, and a dish nobody reported leftovers for says that too, rather than showing
 * a comfortable zero. Under the counts sit the guests' own words, in whatever
 * language they used, because a count tells a kitchen that a bowl came back and
 * only a sentence tells them the rice was cold.
 */
export default function OperationsFeedbackScreen() {
  const stations = useBonaFlowStore((state) => state.stations);
  const ratings = useBonaFlowStore((state) => state.ratings);
  const redemptions = useBonaFlowStore((state) => state.redemptions);
  const lastSyncedAt = useBonaFlowStore((state) => state.lastSyncedAt);
  const poll = useLivePoll();

  const rows = useMemo(
    () => summariseFeedback(stations, ratings),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [stations, ratings, poll.revision],
  );

  const topReasons = useMemo(
    () => rankReasons(ratings),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [ratings, poll.revision],
  );

  const scored = ratings.filter((rating) => rating.score !== null).length;

  return (
    <Screen scroll edges={['left', 'right']} contentClassName="gap-5 px-5 py-4">
      <View className="gap-1">
        <Text className="text-foreground text-2xl font-semibold">Guest feedback</Text>
        <MonoText className="text-muted text-xs">
          {ratings.length} {ratings.length === 1 ? 'review' : 'reviews'} · {scored} scored ·{' '}
          {lastSyncedAt === null ? 'not synced yet' : `synced ${formatClock(lastSyncedAt)}`}
        </MonoText>
      </View>

      {ratings.length === 0 ? (
        <Text className="text-muted text-base">
          No reviews yet. They appear here the moment a guest sends one, without anyone refreshing.
        </Text>
      ) : (
        <Card level="sm" className="gap-2 rounded-3xl p-4">
          <MonoText className="text-muted text-[11px]">why food is coming back</MonoText>
          {topReasons.length === 0 ? (
            <Text className="text-muted text-sm">
              Nobody has given a reason yet — only scores so far.
            </Text>
          ) : (
            topReasons.map((entry) => (
              <View key={entry.reason} className="flex-row items-center justify-between gap-3">
                <Text className="text-foreground flex-1 text-sm">{reasonLabel(entry.reason)}</Text>
                <MonoText className="text-foreground text-sm">{entry.count}</MonoText>
              </View>
            ))
          )}
        </Card>
      )}

      {rows.map((row) => (
        <FeedbackCard key={row.dish.id} feedback={row} />
      ))}

      {redemptions.length === 0 ? null : (
        <View className="gap-2">
          <Text className="text-foreground text-lg font-semibold">Rewards taken</Text>
          {redemptions.map((redemption) => (
            <Card key={redemption.id} level="sm" className="gap-1 rounded-3xl p-4">
              <Text className="text-foreground text-base">{redemption.rewardLabel}</Text>
              <MonoText className="text-muted text-[11px]">
                {redemption.code} · {redemption.cost} points · {formatClock(redemption.createdAt)}
              </MonoText>
            </Card>
          ))}
        </View>
      )}

      <Text className="text-muted text-xs">
        Reviews are stored against an anonymous device id, never a person. Points are awarded by the
        backend, and the first review of a dish from a device is the only one that earns.
      </Text>
    </Screen>
  );
}

function FeedbackCard({ feedback }: { feedback: DishFeedback }) {
  return (
    <Card level="md" className="gap-4 rounded-3xl p-5">
      <View className="flex-row items-start gap-3">
        <DishPhoto image={feedback.dish.image} name={feedback.dish.name} size={56} />
        <View className="flex-1 gap-0.5">
          <Text className="text-foreground text-base font-semibold">{feedback.dish.name}</Text>
          <MonoText className="text-muted text-[11px]">
            {feedback.station.name} · {feedback.count} {feedback.count === 1 ? 'review' : 'reviews'}
          </MonoText>
        </View>
      </View>

      <View className="gap-1">
        <MonoText className="text-foreground text-xs">{scoreLine(feedback)}</MonoText>
        <MonoText className="text-foreground text-xs">{wasteLine(feedback)}</MonoText>
      </View>

      {feedback.reasons.length === 0 ? null : (
        <View className="border-separator gap-1 border-t pt-3">
          <MonoText className="text-muted text-[11px]">reasons given</MonoText>
          {feedback.reasons.map((entry) => (
            <View key={entry.reason} className="flex-row items-center justify-between gap-3">
              <Text className="text-foreground flex-1 text-sm">{reasonLabel(entry.reason)}</Text>
              <MonoText className="text-foreground text-sm">{entry.count}</MonoText>
            </View>
          ))}
        </View>
      )}

      {feedback.comments.length === 0 ? null : (
        <View className="border-separator gap-2 border-t pt-3">
          <MonoText className="text-muted text-[11px]">in their own words</MonoText>
          {feedback.comments.slice(0, 4).map((comment) => (
            <View key={`${comment.createdAt}-${comment.text.slice(0, 12)}`} className="gap-0.5">
              <Text className="text-foreground text-sm">“{comment.text}”</Text>
              <MonoText className="text-muted text-[10px]">
                {comment.language === 'de' ? 'German' : comment.language === 'en' ? 'English' : '—'}{' '}
                · {formatAge(comment.createdAt)}
              </MonoText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
