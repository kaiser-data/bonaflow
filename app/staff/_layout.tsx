import { ClipboardList, ListChecks, UtensilsCrossed } from 'lucide-react-native';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchModeButton } from '@/components/SwitchModeButton';
import { Touchable } from '@/components/ui/Touchable';
import { MIN_TOUCH_TARGET } from '@/lib/platform';
import { colors } from '@/lib/theme';

/** Tab bar content height, before the bottom safe-area inset is added. */
const TAB_BAR_CONTENT_HEIGHT = 60;

const LONG_PRESS_MS = 600;

/**
 * Hidden demo override: long-pressing the Report tab, in the bar or in the
 * header, opens the panel that forces the scripted state change. Works offline
 * on both platforms.
 */
function ReportTabButton({
  children,
  onPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={() => router.push('/staff-override')}
      delayLongPress={LONG_PRESS_MS}
      style={{
        flex: 1,
        minHeight: MIN_TOUCH_TARGET,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

function ReportHeaderTitle() {
  const router = useRouter();

  return (
    <Touchable
      accessibilityLabel="Report"
      onLongPress={() => router.push('/staff-override')}
      delayLongPress={LONG_PRESS_MS}
      pressedClassName=""
      pressedScale={1}
      className="flex-none items-start justify-center"
    >
      <Text className="text-foreground text-[17px] font-semibold">Report</Text>
    </Touchable>
  );
}

export default function StaffTabLayout() {
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
        tabBarItemStyle: { minHeight: MIN_TOUCH_TARGET },
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
        name="report"
        options={{
          title: 'Report',
          headerTitle: () => <ReportHeaderTitle />,
          tabBarButton: (props) => <ReportTabButton {...props} />,
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size ?? 24} />,
        }}
      />
    </Tabs>
  );
}
