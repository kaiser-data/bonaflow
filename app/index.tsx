import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { useBonaFlowStore, type AppMode } from '@/lib/store';

const MODE_BUTTON_HEIGHT = 76;

/** Start screen. Switches views only — no accounts, passwords or roles. */
export default function ModeSelectScreen() {
  const router = useRouter();
  const event = useBonaFlowStore((state) => state.event);
  const setMode = useBonaFlowStore((state) => state.setMode);

  const choose = (mode: AppMode) => {
    setMode(mode);
    if (mode === 'guest') {
      router.push('/stations');
      return;
    }
    router.push(mode === 'staff' ? '/staff' : '/operations');
  };

  return (
    <Screen scroll contentClassName="justify-between gap-10 px-6 py-10">
      <View className="gap-3">
        <Text className="text-foreground text-4xl font-bold">BonaFlow</Text>
        <Text className="text-muted text-lg">Find food faster. Keep every station flowing.</Text>
      </View>

      <View className="gap-4">
        <Touchable
          accessibilityLabel="Continue as guest"
          onPress={() => choose('guest')}
          className="bg-accent flex-none items-center justify-center rounded-3xl px-6"
          style={{ minHeight: MODE_BUTTON_HEIGHT }}
        >
          <Text className="text-accent-foreground text-2xl font-semibold">Guest</Text>
        </Touchable>

        <Touchable
          accessibilityLabel="Continue as staff"
          onPress={() => choose('staff')}
          className="bg-surface border-border flex-none items-center justify-center rounded-3xl border px-6"
          style={{ minHeight: MODE_BUTTON_HEIGHT }}
        >
          <Text className="text-foreground text-2xl font-semibold">Staff</Text>
        </Touchable>

        <Touchable
          accessibilityLabel="Continue to operations"
          onPress={() => choose('operations')}
          className="bg-surface border-border flex-none items-center justify-center rounded-3xl border px-6"
          style={{ minHeight: MODE_BUTTON_HEIGHT }}
        >
          <Text className="text-foreground text-2xl font-semibold">Operations</Text>
        </Touchable>
      </View>

      <View className="gap-1">
        <Text className="text-muted text-base">{event.name}</Text>
        <MonoText className="text-muted text-xs">
          {event.venue} · {event.guests} guests · lunch {event.serviceStart}–{event.serviceEnd}
        </MonoText>
      </View>
    </Screen>
  );
}
