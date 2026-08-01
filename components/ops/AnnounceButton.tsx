import { useState } from 'react';
import { Text, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { colors } from '@/lib/theme';
import { speakAnnouncement } from '@/lib/voice';

export type AnnounceButtonProps = {
  /** Exactly what will be spoken. Written by app code, never by a model. */
  text: string;
  label?: string;
};

/**
 * Plays a line out loud for the room. The speech is produced server-side, so a
 * failure here is never fatal: the reason is shown in one line and the written
 * alert is still on screen.
 */
export function AnnounceButton({ text, label = 'Announce' }: AnnounceButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const announce = async () => {
    setHint(null);
    setSpeaking(true);
    const outcome = await speakAnnouncement(text);
    setSpeaking(false);
    if (!outcome.ok) setHint(outcome.reason);
  };

  return (
    <View className="gap-1.5">
      <Touchable
        accessibilityLabel={`${label} this alert out loud`}
        accessibilityState={{ disabled: speaking, busy: speaking }}
        disabled={speaking}
        onPress={() => void announce()}
        style={{ minHeight: 48 }}
        className="border-border bg-surface flex-row items-center gap-2 self-start rounded-2xl border px-4"
      >
        <Volume2 color={speaking ? colors.muted : colors.foreground} size={18} />
        <Text
          className={
            speaking ? 'text-muted text-sm font-semibold' : 'text-foreground text-sm font-semibold'
          }
        >
          {speaking ? 'Announcing…' : label}
        </Text>
      </Touchable>

      {hint === null ? null : <MonoText className="text-muted text-[11px]">{hint}</MonoText>}
    </View>
  );
}
