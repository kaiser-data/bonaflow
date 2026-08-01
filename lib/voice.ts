import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { backendConfigured, bilt } from '@/lib/backend';
import type { AudioAttachment } from '@/lib/store';

/**
 * Voice service client.
 *
 * The ElevenLabs API key never exists in this app. Both directions go through
 * the `elevenlabs-voice` Bilt Cloud function, which reads the key from a
 * server-side secret:
 *   - speech to text: a hold-to-talk recording becomes a transcript, which the
 *     deterministic interpreter in lib/reports.ts then reads into draft fields.
 *   - text to speech: an alert becomes spoken audio for the room.
 *
 * Every failure here is soft. A refusal, a timeout or no network at all returns
 * a plain-language reason and the caller carries on by hand — the demo is
 * completable with the voice service entirely unreachable.
 */

/** Long enough for a short note on conference wifi, short enough to not hang. */
const TRANSCRIBE_TIMEOUT_MS = 20000;
const SPEAK_TIMEOUT_MS = 20000;
/** Safety net in case a player never reports that it finished. */
const MAX_PLAYBACK_MS = 60000;

const OFFLINE_TRANSCRIBE =
  'The voice service could not be reached, so fill in the fields yourself.';
const OFFLINE_SPEAK = 'The voice service could not be reached, so this was not announced.';

export type TranscriptOutcome = { ok: true; text: string } | { ok: false; reason: string };
export type SpeakOutcome = { ok: true } | { ok: false; reason: string };

/** Exactly what the `elevenlabs-voice` function answers with. */
type VoiceResponse = {
  ok?: boolean;
  error?: string;
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  extension?: string;
};

function isWeb(uri: string): boolean {
  return Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:');
}

async function withTimeout<T>(work: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** null means the call could not be completed at all. */
async function callVoiceService(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<VoiceResponse | null> {
  if (!backendConfigured) return null;

  const request = (async (): Promise<VoiceResponse | null> => {
    try {
      const { data, error } = await bilt.functions.invoke<VoiceResponse>('elevenlabs-voice', {
        body,
      });
      if (error !== null || data === null) return null;
      return data;
    } catch {
      return null;
    }
  })();

  return await withTimeout(request, timeoutMs, null);
}

/** Reads a recording as base64, whatever container and platform produced it. */
async function readRecordingBase64(uri: string): Promise<string | null> {
  try {
    if (!isWeb(uri)) return await new File(uri).base64();

    // Web recorders hand back a blob URL, which the file system cannot open.
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('error', () => resolve(null), { once: true });
      reader.addEventListener(
        'load',
        () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          const comma = result.indexOf(',');
          resolve(comma === -1 ? null : result.slice(comma + 1));
        },
        { once: true },
      );
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Sends a voice note for transcription. The container and mime type are passed
 * through exactly as the recorder reported them — iOS m4a, Android m4a or 3gp,
 * web webm or ogg — because the function accepts whatever arrives.
 */
export async function transcribeVoiceNote(audio: AudioAttachment): Promise<TranscriptOutcome> {
  const audioBase64 = await readRecordingBase64(audio.uri);
  if (audioBase64 === null || audioBase64.length === 0) {
    return { ok: false, reason: 'That recording could not be read, so type the update instead.' };
  }

  const response = await callVoiceService(
    {
      action: 'stt',
      audioBase64,
      mimeType: audio.mimeType,
      extension: audio.extension,
      durationMs: audio.durationMs,
    },
    TRANSCRIBE_TIMEOUT_MS,
  );

  if (response === null) return { ok: false, reason: OFFLINE_TRANSCRIBE };

  const text = typeof response.text === 'string' ? response.text.trim() : '';
  if (response.ok !== true || text.length === 0) {
    return { ok: false, reason: response.error ?? OFFLINE_TRANSCRIBE };
  }

  return { ok: true, text };
}

let currentPlayer: AudioPlayer | null = null;

function release(player: AudioPlayer): void {
  try {
    player.remove();
  } catch {
    // Already released; nothing to do.
  }
  if (currentPlayer === player) currentPlayer = null;
}

/** Stops the announcement that is playing, if any. */
export function stopSpeaking(): void {
  if (currentPlayer === null) return;
  const player = currentPlayer;
  try {
    player.pause();
  } catch {
    // Already stopped.
  }
  release(player);
}

/** Resolves when the clip has finished, so a caller can keep its button busy. */
async function playAnnouncement(uri: string): Promise<void> {
  stopSpeaking();

  /**
   * `playsInSilentMode` is what makes this audible. Without it, an iPhone with
   * the ring/silent switch set to silent plays nothing at all and reports no
   * error — the announcement simply never happens. `allowsRecording` is turned
   * back off so playback is loud rather than routed to the recording session.
   */
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri });
  currentPlayer = player;

  await new Promise<void>((resolve) => {
    let settled = false;
    let subscription: { remove: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      subscription?.remove();
      resolve();
    };

    const waitFor = (ms: number) => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(finish, Math.min(ms, MAX_PLAYBACK_MS));
    };

    subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        finish();
        return;
      }
      // Browsers do not always report the finish, so the clip's own remaining
      // time is used as the deadline and refreshed on every status update.
      if (status.duration > 0) {
        waitFor(Math.max(0, status.duration - status.currentTime) * 1000 + 750);
      }
    });

    waitFor(MAX_PLAYBACK_MS);
    player.play();
  });

  release(player);
}

/** Cached announcement file. One clip plays at a time, so one file is enough. */
function writeAnnouncementFile(audioBase64: string, extension: string): string {
  const safeExtension = /^[a-z0-9]{1,5}$/.test(extension) ? extension : 'mp3';
  const file = new File(Paths.cache, `bonaflow-announcement.${safeExtension}`);
  file.create({ overwrite: true, intermediates: true });
  file.write(audioBase64, { encoding: 'base64' });
  return file.uri;
}

/** Speaks a line out loud. The text is written by app code, never by a model. */
export async function speakAnnouncement(text: string): Promise<SpeakOutcome> {
  const response = await callVoiceService({ action: 'tts', text }, SPEAK_TIMEOUT_MS);
  if (response === null) return { ok: false, reason: OFFLINE_SPEAK };

  const audioBase64 = typeof response.audioBase64 === 'string' ? response.audioBase64 : '';
  if (response.ok !== true || audioBase64.length === 0) {
    return { ok: false, reason: response.error ?? OFFLINE_SPEAK };
  }

  const mimeType = response.mimeType ?? 'audio/mpeg';
  const extension = response.extension ?? 'mp3';

  try {
    const uri =
      Platform.OS === 'web'
        ? `data:${mimeType};base64,${audioBase64}`
        : writeAnnouncementFile(audioBase64, extension);
    await playAnnouncement(uri);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'This device could not play the announcement.' };
  }
}
