import { Bell, Sparkles, UtensilsCrossed } from 'lucide-react-native';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Touchable } from '@/components/ui/Touchable';
import { useBonaFlowStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/** Tab bar content height, before the bottom safe-area inset is added. */
const TAB_BAR_CONTENT_HEIGHT = 60;

function SwitchModeButton() {
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

export default function GuestTabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { color: colors.foreground, fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SwitchModeButton />,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          // The bottom inset is added to the bar height so tab items never sit
          // under the iPhone home indicator or the Android gesture bar.
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow,
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: -2 },
            },
            android: { elevation: 8 },
            default: {},
          }),
        },
        tabBarItemStyle: { minHeight: 44 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="stations"
        options={{
          title: 'Stations',
          tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="for-you"
        options={{
          title: 'For You',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size ?? 24} />,
        }}
      />
    </Tabs>
  );
}
