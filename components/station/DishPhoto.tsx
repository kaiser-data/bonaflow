import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { dishImageUrl } from '@/lib/menu';
import { cn } from '@/lib/utils';

/** Thumbnail edge, in points. The photos are the best thing on the screen. */
export const DISH_PHOTO_SIZE = 64;

/** Corner radius, in points. Small enough that the food is not cropped away. */
const DISH_PHOTO_RADIUS = 8;

export type DishPhotoProps = {
  /** Photo filename stored with the dish. Empty when there is no photo. */
  image: string;
  /** Used for the accessibility label and the fallback initials. */
  name: string;
  size?: number;
  className?: string;
};

/**
 * Photo of the actual bowl, taken at the event.
 *
 * The size and the corner radius are set in `style` rather than in classes,
 * because Expo web sizes these from the style prop and would otherwise render the
 * file at its natural dimensions. A missing or unreachable photo falls back to the
 * dish's initials — never a broken image slot and never a spinner that outlives
 * the screen.
 */
export function DishPhoto({ image, name, size = DISH_PHOTO_SIZE, className }: DishPhotoProps) {
  const [failed, setFailed] = useState(false);
  const uri = dishImageUrl(image);

  if (uri === null || failed) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`No photo of ${name}`}
        style={{ width: size, height: size, borderRadius: DISH_PHOTO_RADIUS }}
        className={cn('bg-default border-border items-center justify-center border', className)}
      >
        <Text className="text-muted text-base font-semibold">{initials(name)}</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`Photo of ${name}`}
      source={{ uri }}
      resizeMode="cover"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: DISH_PHOTO_RADIUS }}
      className={cn('bg-default', className)}
    />
  );
}

/** At most two letters, so the fallback stays legible at thumbnail size. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}
