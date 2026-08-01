import { Text, View } from 'react-native';

import { MonoText } from '@/components/ui/MonoText';
import type { Incentive } from '@/lib/store';
import { incentiveAttribution } from '@/lib/stations';

export type IncentiveChipProps = { incentive: Incentive };

/**
 * Operational lever shown with the redirect that is already happening. There is
 * no claim step: redemption is simply showing this screen at the station.
 */
export function IncentiveChip({ incentive }: IncentiveChipProps) {
  return (
    <View className="gap-1.5">
      <View className="bg-default border-border self-start rounded-full border px-3 py-1.5">
        <Text className="text-foreground text-xs font-semibold">{incentive.text}</Text>
      </View>
      <MonoText className="text-muted text-[11px]">{incentiveAttribution(incentive)}</MonoText>
    </View>
  );
}
