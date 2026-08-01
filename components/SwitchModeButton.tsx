import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Touchable } from '@/components/ui/Touchable';
import { useBonaFlowStore } from '@/lib/store';

/** Header action that returns to the mode selector. No accounts are involved. */
export function SwitchModeButton() {
  const router = useRouter();
  const setMode = useBonaFlowStore((state) => state.setMode);

  return (
    <Touchable
      accessibilityLabel="Switch mode"
      onPress={() => {
        setMode(null);
        router.replace('/');
      }}
      className="flex-none items-end justify-center pr-4 pl-2"
    >
      <Text className="text-muted text-sm font-medium">Switch mode</Text>
    </Touchable>
  );
}
