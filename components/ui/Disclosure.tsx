import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { FadeIn } from 'react-native-reanimated';

import { MonoText } from '@/components/ui/MonoText';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { Touchable } from '@/components/ui/Touchable';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** How long the body takes to appear. Short enough not to delay a read. */
const REVEAL_MS = 200;

export type DisclosureTone =
  /** A step or a block of controls. Header reads as a heading. */
  | 'section'
  /** Small print: an explanation, a privacy note, a data caveat. */
  | 'note';

export type DisclosureProps = {
  /** Says what is inside. Never "more" or "details". */
  title: string;
  /** Optional caption, visible open or closed. Use it to keep the gist on screen. */
  hint?: string;
  tone?: DisclosureTone;
  children: ReactNode;
  /** Uncontrolled starting state. Ignored when `open` is passed. */
  defaultOpen?: boolean;
  /** Pass with `onOpenChange` when the screen needs to drive or observe the state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
};

/**
 * The one way this app hides secondary text.
 *
 * Screens were carrying every explanation, caveat and privacy note at full length
 * at all times, which buried the thing the person actually came to do. Anything
 * that is true but not needed on the first read goes in here instead: the header
 * states what is inside — so it can be skipped deliberately rather than guessed
 * at — and the body is mounted only while open, so a closed section costs one
 * line of height.
 *
 * Required copy never goes in here. An allergen statement, a price and a "nothing
 * is sent until you press Send" have to be readable without a tap; only their
 * elaboration is collapsible.
 *
 * Controlled or uncontrolled: pass `open` + `onOpenChange` when the screen needs
 * to react (scrolling to the section it just revealed, for instance), otherwise
 * leave it alone and it keeps its own state.
 */
export function Disclosure({
  title,
  hint,
  tone = 'section',
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  contentClassName,
}: DisclosureProps) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = openProp ?? selfOpen;
  const note = tone === 'note';

  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setSelfOpen(next);
    onOpenChange?.(next);
  };

  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <View className={cn('gap-2', className)}>
      <Touchable
        accessibilityLabel={title}
        accessibilityHint={open ? 'Hides this text' : 'Shows this text'}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        className="flex-row items-center justify-between gap-3"
      >
        <View className="flex-1 gap-0.5">
          {note ? (
            <MonoText className="text-muted text-[11px]">{title}</MonoText>
          ) : (
            <Text className="text-foreground text-base font-semibold">{title}</Text>
          )}
          {hint === undefined ? null : (
            <MonoText className="text-muted text-[11px]">{hint}</MonoText>
          )}
        </View>
        <Chevron color={note ? colors.muted : colors.foreground} size={note ? 14 : 18} />
      </Touchable>

      {open ? (
        <AnimatedView
          entering={FadeIn.duration(REVEAL_MS)}
          className={cn(note ? 'gap-1' : 'gap-4', contentClassName)}
        >
          {children}
        </AnimatedView>
      ) : null}
    </View>
  );
}
