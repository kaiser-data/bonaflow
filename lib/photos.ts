import * as ImagePicker from 'expo-image-picker';

/**
 * Tray photos. One code path covers iOS and Android because both the camera and
 * the library go through expo-image-picker. Camera and library permissions are
 * requested separately, since granting one says nothing about the other.
 */

export type PhotoSource = 'camera' | 'library';

export type PhotoOutcome =
  | { status: 'picked'; uri: string }
  | { status: 'denied'; source: PhotoSource }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsMultipleSelection: false,
};

export async function captureTrayPhoto(): Promise<PhotoOutcome> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied', source: 'camera' };

    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (result.canceled) return { status: 'cancelled' };
    return { status: 'picked', uri: result.assets[0].uri };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function pickTrayPhotoFromLibrary(): Promise<PhotoOutcome> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied', source: 'library' };

    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return { status: 'cancelled' };
    return { status: 'picked', uri: result.assets[0].uri };
  } catch {
    return { status: 'unavailable' };
  }
}
