import { Linking, Text, View } from 'react-native';

import { Touchable } from '@/components/ui/Touchable';
import { Card } from '@/components/ui/Card';

export type PermissionNoticeProps = {
  message: string;
};

async function openSettings() {
  try {
    await Linking.openSettings();
  } catch {
    // Some platforms have no app settings screen. Typing still works.
  }
}

/**
 * Shown when the microphone, camera or library is denied. iOS never prompts
 * again from inside the app, so the only way back is the system settings — and
 * the report can always be completed by typing instead.
 */
export function PermissionNotice({ message }: PermissionNoticeProps) {
  return (
    <Card level="sm" className="gap-3 rounded-3xl p-4">
      <Text className="text-foreground text-base">{message}</Text>
      <View className="flex-row">
        <Touchable
          accessibilityLabel="Open Settings"
          onPress={() => void openSettings()}
          className="flex-none items-start justify-center"
        >
          <Text className="text-foreground text-base font-semibold underline">Open Settings</Text>
        </Touchable>
      </View>
    </Card>
  );
}
