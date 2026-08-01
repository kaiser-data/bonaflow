import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { keyboardBehavior } from '@/lib/platform';
import { cn } from '@/lib/utils';

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

export type ScreenProps = {
  children: ReactNode;
  /**
   * Which safe-area insets to apply. Screens rendered inside the tab navigator
   * usually skip 'bottom' because the tab bar already absorbs that inset, and
   * skip 'top' when a navigation header is visible.
   */
  edges?: readonly ScreenEdge[];
  /** Render content inside a ScrollView. */
  scroll?: boolean;
  /** Required for any screen containing a text input. */
  keyboardAvoiding?: boolean;
  /** Height of a visible navigation header, so keyboard avoidance lines up. */
  keyboardVerticalOffset?: number;
  /** Extra bottom space, e.g. for a sticky action bar. */
  bottomOffset?: number;
  /** Classes for the outer full-screen container. */
  className?: string;
  /** Classes for the inset content container. */
  contentClassName?: string;
};

const ALL_EDGES: readonly ScreenEdge[] = ['top', 'bottom', 'left', 'right'];

/**
 * Screen shell that resolves real device insets (notch / Dynamic Island, Android
 * status bar, home indicator, gesture bar) instead of hardcoded padding.
 */
export function Screen({
  children,
  edges = ALL_EDGES,
  scroll = false,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  bottomOffset = 0,
  className,
  contentClassName,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const insetStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + bottomOffset,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={[insetStyle, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
    >
      <View className={cn('flex-1', contentClassName)}>{children}</View>
    </ScrollView>
  ) : (
    <View style={insetStyle} className={cn('flex-1', contentClassName)}>
      {children}
    </View>
  );

  return (
    <View className={cn('bg-background flex-1', className)}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={keyboardBehavior}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}
