import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Mic } from 'lucide-react-native';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { MonoText } from '@/components/ui/MonoText';
import { Touchable } from '@/components/ui/Touchable';
import { describeRecording, formatDuration } from '@/lib/audio';
import { shadow } from '@/lib/platform';
import type { AudioAttachment } from '@/lib/store';
import { colors } from '@/lib/theme';

export type HoldToTalkButtonProps = {
  onRecorded: (audio: AudioAttachment) => void;
  /**
   * The microphone cannot be used: permission denied, unsupported, or the
   * recorder failed. The caller must fall back to the text field.
   */
  onUnavailable: () => void;
};

/** Ignore accidental taps; a usable note needs at least this long. */
const MIN_HOLD_MS = 800;

/**
 * iOS audio session for recording.
 *
 * `allowsRecording` routes the session to the microphone. `playsInSilentMode`
 * is just as important: without it, playback is completely silent whenever the
 * ring/silent switch is set to silent, with no error at all.
 */
async function enterRecordingMode(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

/** Back to loud playback on both platforms once recording is finished. */
async function enterPlaybackMode(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
}

/** Hold-to-talk. Records while pressed, stops on release. */
export function HoldToTalkButton({ onRecorded, onUnavailable }: HoldToTalkButtonProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const holdingRef = useRef(false);
  const startedAtRef = useRef(0);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      holdingRef.current = false;
      void enterPlaybackMode();
    };
  }, []);

  const startHold = useCallback(async () => {
    holdingRef.current = true;
    setHint(null);

    try {
      // Permission is requested through the Expo audio module before recording.
      const existing = await getRecordingPermissionsAsync();
      const granted = existing.granted || (await requestRecordingPermissionsAsync()).granted;
      if (!granted) {
        holdingRef.current = false;
        onUnavailable();
        return;
      }

      await enterRecordingMode();
      await recorder.prepareToRecordAsync();

      if (!holdingRef.current) {
        // Released before the recorder was ready.
        await enterPlaybackMode();
        return;
      }

      startedAtRef.current = Date.now();
      recorder.record();
    } catch {
      holdingRef.current = false;
      startedAtRef.current = 0;
      await enterPlaybackMode();
      onUnavailable();
    }
  }, [onUnavailable, recorder]);

  const endHold = useCallback(async () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;

    const heldMs = startedAtRef.current === 0 ? 0 : Date.now() - startedAtRef.current;
    startedAtRef.current = 0;

    if (!recorder.isRecording) {
      await enterPlaybackMode();
      return;
    }

    try {
      await recorder.stop();
    } catch {
      await enterPlaybackMode();
      onUnavailable();
      return;
    }

    await enterPlaybackMode();

    const uri = recorder.uri;
    if (uri === null) {
      setHint('That recording could not be saved. Type the update instead.');
      return;
    }
    if (heldMs < MIN_HOLD_MS) {
      setHint('Hold the button while you speak.');
      return;
    }

    // The container and mime type come from the URI the recorder produced.
    onRecorded(describeRecording(uri, heldMs));
  }, [onRecorded, onUnavailable, recorder]);

  const recording = recorderState.isRecording;

  return (
    <View className="gap-2">
      <Touchable
        accessibilityLabel="Hold to talk"
        onPressIn={() => void startHold()}
        onPressOut={() => void endHold()}
        style={[{ minHeight: 84 }, shadow('sm')]}
        className={
          recording
            ? 'border-foreground bg-foreground flex-row items-center justify-center gap-3 rounded-3xl border px-5'
            : 'border-border bg-surface flex-row items-center justify-center gap-3 rounded-3xl border px-5'
        }
      >
        <Mic color={recording ? colors.background : colors.foreground} size={26} />
        <View>
          <Text
            className={
              recording
                ? 'text-background text-lg font-semibold'
                : 'text-foreground text-lg font-semibold'
            }
          >
            {recording ? 'Recording — release to stop' : 'Hold to talk'}
          </Text>
          {recording ? (
            <MonoText className="text-background text-xs">
              {formatDuration(recorderState.durationMillis)}
            </MonoText>
          ) : (
            <MonoText className="text-muted text-xs">voice note · no transcription</MonoText>
          )}
        </View>
      </Touchable>

      {hint === null ? null : <Text className="text-muted text-sm">{hint}</Text>}
    </View>
  );
}
