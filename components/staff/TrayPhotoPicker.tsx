import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Camera, ImagePlus, X } from 'lucide-react-native';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { captureTrayPhoto, pickTrayPhotoFromLibrary, type PhotoSource } from '@/lib/photos';
import { colors } from '@/lib/theme';

export type TrayPhotoPickerProps = {
  photoUri: string | null;
  onPicked: (uri: string) => void;
  onRemove: () => void;
  /** Camera or library permission denied — the caller falls back to text. */
  onDenied: (source: PhotoSource) => void;
};

const THUMBNAIL_SIZE = 72;

/** Optional tray photo, from the camera or the photo library. */
export function TrayPhotoPicker({ photoUri, onPicked, onRemove, onDenied }: TrayPhotoPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handle = async (source: PhotoSource) => {
    setHint(null);
    const outcome =
      source === 'camera' ? await captureTrayPhoto() : await pickTrayPhotoFromLibrary();

    if (outcome.status === 'picked') {
      setExpanded(false);
      onPicked(outcome.uri);
      return;
    }
    if (outcome.status === 'denied') {
      setExpanded(false);
      onDenied(outcome.source);
      return;
    }
    if (outcome.status === 'unavailable') {
      setHint(
        source === 'camera'
          ? 'No camera is available on this device. Attach a photo from the library instead.'
          : 'The photo library is not available on this device.',
      );
    }
  };

  if (photoUri !== null) {
    return (
      <View className="border-border bg-surface flex-row items-center gap-4 rounded-3xl border p-4">
        <Image
          source={{ uri: photoUri }}
          // Web needs the critical dimensions in `style`, not only in classes.
          style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: 16 }}
          resizeMode="cover"
          accessibilityLabel="Attached tray photo"
        />
        <View className="flex-1 gap-1">
          <Text className="text-foreground text-base font-medium">Tray photo attached</Text>
          <MonoText className="text-muted text-[11px]">sent with the next update</MonoText>
        </View>
        <Touchable
          accessibilityLabel="Remove tray photo"
          onPress={onRemove}
          className="border-border items-center justify-center rounded-full border px-3"
        >
          <X color={colors.foreground} size={18} />
        </Touchable>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {expanded ? (
        <View className="flex-row gap-3">
          <Touchable
            accessibilityLabel="Take a photo"
            onPress={() => void handle('camera')}
            className="border-border bg-surface flex-1 flex-row items-center justify-center gap-2 rounded-3xl border px-4"
            style={{ minHeight: 60 }}
          >
            <Camera color={colors.foreground} size={20} />
            <Text className="text-foreground text-base font-semibold">Take photo</Text>
          </Touchable>
          <Touchable
            accessibilityLabel="Choose a photo from the library"
            onPress={() => void handle('library')}
            className="border-border bg-surface flex-1 flex-row items-center justify-center gap-2 rounded-3xl border px-4"
            style={{ minHeight: 60 }}
          >
            <ImagePlus color={colors.foreground} size={20} />
            <Text className="text-foreground text-base font-semibold">Library</Text>
          </Touchable>
        </View>
      ) : (
        <Touchable
          accessibilityLabel="Add tray photo"
          onPress={() => setExpanded(true)}
          className="border-border bg-surface flex-row items-center justify-center gap-2 rounded-3xl border px-4"
          style={{ minHeight: 60 }}
        >
          <ImagePlus color={colors.foreground} size={20} />
          <Text className="text-foreground text-base font-semibold">Add tray photo</Text>
        </Touchable>
      )}

      {hint === null ? null : <Text className="text-muted text-sm">{hint}</Text>}
    </View>
  );
}
