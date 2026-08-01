import { Image, View } from 'react-native';

import { MonoText } from '@/components/ui/MonoText';

const SIZE = 88;

/**
 * The tray photo attached to a report. It is evidence for a human and nothing
 * else: it is never sent to the reading service, so it cannot influence a single
 * field on the update.
 */
export function PhotoEvidence({ uri }: { uri: string }) {
  return (
    <View className="flex-row items-center gap-3">
      {/* Web needs the size in style, not in a class, or the file renders at its natural size. */}
      <Image
        source={{ uri }}
        style={{ width: SIZE, height: SIZE, borderRadius: 16 }}
        resizeMode="cover"
        accessibilityLabel="Tray photo attached to this update"
      />
      <MonoText className="text-muted flex-1 text-[11px]">
        tray photo · evidence for the team · not used to read any field
      </MonoText>
    </View>
  );
}
