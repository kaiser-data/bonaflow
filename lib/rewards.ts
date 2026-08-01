import type { LeftoverReason, MealRating, RatingSource, Redemption } from '@/lib/store';

/**
 * What a guest earns for telling the kitchen the truth, and what they can take
 * with it.
 *
 * The point of this is not gamification. A caterer only finds out why food came
 * back if somebody stops on the way to the bin and says so, and that costs the
 * guest thirty seconds they did not plan to spend. The reward is payment for that
 * thirty seconds, which is why the extra points sit on exactly the two things
 * that make an answer useful: a stated reason, and words rather than taps.
 *
 * Deliberately absent: streaks, tiers, levels, badges, leaderboards and anything
 * that rewards volume. The first rating of a dish from a device earns; a second
 * rating of the same dish is still recorded, because the kitchen wants the words,
 * but earns nothing. The backend applies exactly this rule and is the authority;
 * the same rule runs here so the screen can show the total immediately without
 * lying about it.
 */

/** A rating that says something earns 10. */
export const POINTS_BASE = 10;

/** A stated reason is what makes a rating actionable, so it is worth more. */
export const POINTS_REASON_BONUS = 5;

/** Spoken feedback carries detail no chip does. */
export const POINTS_VOICE_BONUS = 5;

export type Reward = {
  id: string;
  label: string;
  /** Points needed. */
  cost: number;
  /** Where it is collected. Null means any counter. */
  stationId: string | null;
  /** What the guest actually gets, in plain words. */
  detail: string;
};

/**
 * Set by the event organiser, exactly like the redirect incentive. A model never
 * invents one of these and staff cannot add one from a phone.
 */
export const REWARDS: readonly Reward[] = [
  {
    id: 'reward-coffee',
    label: 'Free coffee',
    cost: 15,
    stationId: 'station-c',
    detail: 'Show this screen at Counter C.',
  },
  {
    id: 'reward-spare-bowl',
    label: 'Spare bowl at the end of service',
    cost: 40,
    stationId: null,
    detail: 'Show this screen at any counter after 13:45, while bowls are left.',
  },
];

export function findReward(rewardId: string): Reward | undefined {
  return REWARDS.find((reward) => reward.id === rewardId);
}

/** The most a single review can earn: rating + stated reason + spoken. */
export const POINTS_MAX = POINTS_BASE + POINTS_REASON_BONUS + POINTS_VOICE_BONUS;

/**
 * The best this device can still earn for this dish. Zero once the dish has been
 * rated from this phone — the screen has to say that before the guest speaks, not
 * after.
 */
export function potentialPointsFor(input: {
  deviceId: string;
  dishId: string;
  ratings: readonly MealRating[];
}): number {
  const already = input.ratings.some(
    (rating) => rating.deviceId === input.deviceId && rating.dishId === input.dishId,
  );
  return already ? 0 : POINTS_MAX;
}

/**
 * Where this phone stands against what the organiser is handing out.
 *
 * `claimable` — something is already paid for. `unlocks` — this one review is
 * enough to reach the cheapest reward. `short` — it is not, and the line says by
 * how much rather than dangling a reward that is out of reach.
 */
export type RewardProgress =
  | { kind: 'claimable'; reward: Reward }
  | { kind: 'unlocks'; reward: Reward }
  | { kind: 'short'; reward: Reward; short: number };

/** Cheapest first, without mutating the exported list. */
function byCost(): readonly Reward[] {
  return [...REWARDS].sort((left, right) => left.cost - right.cost);
}

export function rewardProgress(balance: number, potential: number): RewardProgress | null {
  const ordered = byCost();
  if (ordered.length === 0) return null;

  // The best thing already paid for, so a guest with points in hand is told to
  // spend them instead of being asked for more.
  const affordable = ordered.filter((reward) => balance >= reward.cost);
  const best = affordable.at(-1);
  if (best !== undefined) return { kind: 'claimable', reward: best };

  const cheapest = ordered[0];
  if (balance + potential >= cheapest.cost) return { kind: 'unlocks', reward: cheapest };
  return { kind: 'short', reward: cheapest, short: cheapest.cost - balance - potential };
}

/**
 * The points a rating earns. Zero when this device has already rated this dish —
 * the same test the backend makes, so the number on screen matches the number in
 * the database.
 */
export function pointsFor(input: {
  deviceId: string;
  dishId: string;
  source: RatingSource;
  reasons: readonly LeftoverReason[];
  ratings: readonly MealRating[];
}): number {
  const already = input.ratings.some(
    (rating) => rating.deviceId === input.deviceId && rating.dishId === input.dishId,
  );
  if (already) return 0;

  return (
    POINTS_BASE +
    (input.reasons.length > 0 ? POINTS_REASON_BONUS : 0) +
    (input.source === 'voice' ? POINTS_VOICE_BONUS : 0)
  );
}

/** Why a rating earned what it earned, in one line the guest can check. */
export function pointsBreakdown(input: {
  deviceId: string;
  dishId: string;
  source: RatingSource;
  reasons: readonly LeftoverReason[];
  ratings: readonly MealRating[];
}): string {
  if (pointsFor(input) === 0) return 'You have already rated this dish, so this one earns nothing.';

  const parts = [`${POINTS_BASE} for the rating`];
  if (input.reasons.length > 0) parts.push(`${POINTS_REASON_BONUS} for saying why`);
  if (input.source === 'voice') parts.push(`${POINTS_VOICE_BONUS} for speaking it`);
  return parts.join(' · ');
}

/** Points earned on this device, minus what it has already taken. */ export function balanceFor(
  ratings: readonly MealRating[],
  redemptions: readonly Redemption[],
  deviceId: string,
): number {
  const earned = ratings
    .filter((rating) => rating.deviceId === deviceId)
    .reduce((total, rating) => total + rating.pointsAwarded, 0);

  const spent = redemptions
    .filter((redemption) => redemption.deviceId === deviceId)
    .reduce((total, redemption) => total + redemption.cost, 0);

  return earned - spent;
}

/** Short code the counter reads off the screen. Unambiguous characters only. */
export function redemptionCode(): string {
  const alphabet = 'ACDEFGHJKLMNPQRTUVWXY34679';
  let code = '';
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BF-${code}`;
}
