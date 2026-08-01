import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Gift } from 'lucide-react-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { formatClock } from '@/lib/stations';
import { deviceId } from '@/lib/device';
import { balanceFor, REWARDS, type Reward } from '@/lib/rewards';
import { findStation, useBonaFlowStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/**
 * What the points are for.
 *
 * There is no wallet, no tier and no streak. A balance, two things the event
 * organiser is actually handing out, and a code the counter can read off the
 * screen. Redeeming does not deduct anything: the balance is always what this
 * phone has earned minus what it has already taken, computed from the same rows
 * the backend holds, so it cannot drift.
 */
export default function RewardsScreen() {
  const router = useRouter();
  const ratings = useBonaFlowStore((state) => state.ratings);
  const redemptions = useBonaFlowStore((state) => state.redemptions);
  const stations = useBonaFlowStore((state) => state.stations);
  const lastRating = useBonaFlowStore((state) => state.lastRating);
  const lastRedemption = useBonaFlowStore((state) => state.lastRedemption);
  const redeemReward = useBonaFlowStore((state) => state.redeemReward);

  const id = deviceId();
  const balance = balanceFor(ratings, redemptions, id);
  const mine = redemptions.filter((redemption) => redemption.deviceId === id);
  const myRatings = ratings.filter((rating) => rating.deviceId === id);

  return (
    <Screen scroll contentClassName="gap-6 px-5 py-4">
      {lastRating === null ? null : (
        <Card level="md" className="gap-1 rounded-3xl p-5">
          <View className="flex-row items-center gap-2">
            <Check color={colors.foreground} size={18} />
            <Text className="text-foreground text-lg font-semibold">
              {lastRating.pointsAwarded === 0
                ? 'Thank you — that one is on the record'
                : `Thank you — ${lastRating.pointsAwarded} points`}
            </Text>
          </View>
          <MonoText className="text-muted text-[11px]">
            the kitchen can see it now · {formatClock(lastRating.createdAt)}
          </MonoText>
        </Card>
      )}

      <View className="gap-1">
        <Text className="text-foreground text-3xl font-semibold">
          {balance} {balance === 1 ? 'point' : 'points'}
        </Text>
        <MonoText className="text-muted text-xs">
          {myRatings.length} {myRatings.length === 1 ? 'review' : 'reviews'} from this phone
        </MonoText>
      </View>

      {lastRedemption === null ? null : (
        <Card level="md" className="gap-2 rounded-3xl p-5">
          <MonoText className="text-muted text-[11px]">show this at the counter</MonoText>
          <Text className="text-foreground text-2xl font-semibold">{lastRedemption.code}</Text>
          <Text className="text-foreground text-base">{lastRedemption.rewardLabel}</Text>
          <MonoText className="text-muted text-[11px]">
            {lastRedemption.stationId === null
              ? 'any counter'
              : (findStation(stations, lastRedemption.stationId)?.name ?? 'any counter')}{' '}
            · taken {formatClock(lastRedemption.createdAt)}
          </MonoText>
        </Card>
      )}

      <View className="gap-3">
        <Text className="text-foreground text-lg font-semibold">Set by the event organiser</Text>
        {REWARDS.map((reward) => (
          <RewardRow
            key={reward.id}
            reward={reward}
            balance={balance}
            onRedeem={() => redeemReward(reward.id)}
          />
        ))}
      </View>

      {mine.length === 0 ? null : (
        <View className="gap-2">
          <Text className="text-foreground text-lg font-semibold">Already taken</Text>
          {mine.map((redemption) => (
            <Card key={redemption.id} level="sm" className="gap-1 rounded-3xl p-4">
              <Text className="text-foreground text-base">{redemption.rewardLabel}</Text>
              <MonoText className="text-muted text-[11px]">
                {redemption.code} · {redemption.cost} points · {formatClock(redemption.createdAt)}
              </MonoText>
            </Card>
          ))}
        </View>
      )}

      <Touchable
        accessibilityLabel="Rate another bowl"
        onPress={() => router.replace('/rate')}
        style={{ minHeight: 56 }}
        className="border-border items-center justify-center rounded-3xl border px-5"
      >
        <Text className="text-foreground text-base font-semibold">Rate another bowl</Text>
      </Touchable>

      <Text className="text-muted text-xs">
        Points belong to this phone, not to a name — there is no account and nothing to sign into.
        Clearing this app&apos;s data clears them.
      </Text>
    </Screen>
  );
}

type RewardRowProps = { reward: Reward; balance: number; onRedeem: () => void };

function RewardRow({ reward, balance, onRedeem }: RewardRowProps) {
  const affordable = balance >= reward.cost;
  const short = reward.cost - balance;

  return (
    <Card level="sm" className="gap-3 rounded-3xl p-4">
      <View className="flex-row items-start gap-3">
        <Gift color={colors.foreground} size={20} />
        <View className="flex-1 gap-0.5">
          <Text className="text-foreground text-base font-semibold">{reward.label}</Text>
          <Text className="text-muted text-xs">{reward.detail}</Text>
        </View>
        <MonoText className="text-foreground text-sm">{reward.cost}</MonoText>
      </View>

      <Touchable
        accessibilityLabel={`Take ${reward.label}`}
        accessibilityState={{ disabled: !affordable }}
        disabled={!affordable}
        onPress={onRedeem}
        style={{ minHeight: 48 }}
        className={
          affordable
            ? 'bg-foreground items-center justify-center rounded-2xl px-4'
            : 'bg-surface border-border items-center justify-center rounded-2xl border px-4'
        }
      >
        <Text
          className={
            affordable
              ? 'text-background text-sm font-semibold'
              : 'text-muted text-sm font-semibold'
          }
        >
          {affordable ? 'Take it' : `${short} more ${short === 1 ? 'point' : 'points'} needed`}
        </Text>
      </Touchable>
    </Card>
  );
}
