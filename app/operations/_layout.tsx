import { Activity, LayoutDashboard, MessageSquare, TriangleAlert } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchModeButton } from '@/components/SwitchModeButton';
import { MIN_TOUCH_TARGET } from '@/lib/platform';
import { colors } from '@/lib/theme';

/** Tab bar content height, before the bottom safe-area inset is added. */
const TAB_BAR_CONTENT_HEIGHT = 60;

/**
 * Operations view: Overview, Alerts, Activity, Feedback. Same shared store as the
 * guest and staff views, so a confirmed report or a guest review reaches these
 * screens without anyone touching them.
 */
export default function OperationsTabLayout() {
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
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <TriangleAlert color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size ?? 24} />,
        }}
      />
    </Tabs>
  );
}
