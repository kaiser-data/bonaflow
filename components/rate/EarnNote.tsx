import { Text, View } from 'react-native';
import { Gift } from 'lucide-react-native';

import { MonoText } from '@/components/ui/MonoText';
import {
  POINTS_BASE,
  POINTS_REASON_BONUS,
  POINTS_VOICE_BONUS,
  type RewardProgress,
} from '@/lib/rewards';
import { colors } from '@/lib/theme';

type EarnNoteProps = {
  /** The most this review can still earn. Zero once the bowl has been rated from this phone. */
  potential: number;
  progress: RewardProgress | null;
  /** Where the named reward is collected. Null means any counter. */
  where: string | null;
};

/**
 * What this review is worth, said before the guest speaks rather than after.
 *
 * A guest carrying a tray needs a reason to stop, so the reason sits directly
 * above the microphone: the points, what makes them go up, and the one thing the
 * organiser is handing out that those points reach. Three lines, so it does not
 * push the microphone off the screen.
 *
 * It stays honest in the case that matters: a bowl this phone has already rated
 * earns nothing, and the note says so instead of promising points the backend will
 * refuse to award.
 */
export function EarnNote({ potential, progress, where }: EarnNoteProps) {
  const earned = potential > 0;

  return (
    <View className="border-border bg-surface gap-1 rounded-3xl border px-4 py-3">
      <View className="flex-row items-center gap-2">
        <Gift color={colors.foreground} size={16} />
        <Text className="text-foreground flex-1 text-base font-semibold">
          {earned ? `Worth up to ${potential} points` : 'You have rated this bowl already'}
        </Text>
      </View>

      <MonoText className="text-muted text-[11px]">
        {earned
          ? `${POINTS_BASE} for the rating · +${POINTS_REASON_BONUS} for saying why · +${POINTS_VOICE_BONUS} for speaking it`
          : 'your words still reach the kitchen · this one earns nothing'}
      </MonoText>

      {progress === null ? null : (
        <Text className="text-muted text-xs">{progressLine(progress, where)}</Text>
      )}
    </View>
  );
}

function progressLine(progress: RewardProgress, where: string | null): string {
  const at = where ?? 'any counter';

  if (progress.kind === 'claimable') {
    return `${progress.reward.label} is already yours — collect it at ${at}.`;
  }

  if (progress.kind === 'unlocks') {
    return `Enough for ${progress.reward.label.toLowerCase()} (${progress.reward.cost} points) at ${at}.`;
  }

  const { short } = progress;
  return `${short} more ${short === 1 ? 'point' : 'points'} after this one for ${progress.reward.label.toLowerCase()}.`;
}
