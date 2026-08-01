import { View } from 'react-native';

import type { StationStatus } from '@/lib/store';
import { statusColor, statusDescription } from '@/lib/stations';

export type StatusDotProps = {
  status: StationStatus;
  /** Diameter in points. */
  size?: number;
};

/**
 * The only element in the interface that carries meaning through colour.
 * Green available, orange running low or busy, red sold out or closed,
 * grey no recent update.
 */
export function StatusDot({ status, size = 26 }: StatusDotProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={statusDescription(status)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: statusColor(status),
      }}
    />
  );
}
