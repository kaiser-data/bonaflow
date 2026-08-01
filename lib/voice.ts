import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { backendConfigured, bilt } from '@/lib/backend';
import { readAudioBase64 } from '@/lib/audio';
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

/**
 * Sends a voice note for transcription. The container and mime type are passed
 * through exactly as the recorder reported them — iOS m4a, Android m4a or 3gp,
 * web webm or ogg — because the function accepts whatever arrives.
 */
export async function transcribeVoiceNote(audio: AudioAttachment): Promise<TranscriptOutcome> {
  const audioBase64 = await readAudioBase64(audio.uri);
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

/**
 * Clips already generated on this device, keyed by the exact text.
 *
 * This is what keeps the stage path off the network: the two announcement lines
 * are generated once, when the app starts, and every later play reads the file
 * (or, in a browser, the in-memory copy) instead of calling the voice service.
 * The service only returns mp3, so one extension is enough.
 */
const CLIP_DIRECTORY = 'announcements';
const webClips = new Map<string, string>();

function clipKey(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function clipFile(text: string): File {
  return new File(Paths.document, CLIP_DIRECTORY, `${clipKey(text)}.mp3`);
}

/** The clip for this exact line if it is already on the device, else null. */
function cachedClipUri(text: string): string | null {
  if (Platform.OS === 'web') return webClips.get(clipKey(text)) ?? null;

  try {
    const file = clipFile(text);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

function storeClip(text: string, audioBase64: string, mimeType: string): string | null {
  try {
    if (Platform.OS === 'web') {
      const uri = `data:${mimeType};base64,${audioBase64}`;
      webClips.set(clipKey(text), uri);
      return uri;
    }

    const file = clipFile(text);
    file.create({ overwrite: true, intermediates: true });
    file.write(audioBase64, { encoding: 'base64' });
    return file.uri;
  } catch {
    return null;
  }
}

type ClipOutcome = { ok: true; uri: string } | { ok: false; reason: string };

/** Asks the voice service for a line and keeps the result for next time. */
async function generateClip(text: string): Promise<ClipOutcome> {
  const response = await callVoiceService({ action: 'tts', text }, SPEAK_TIMEOUT_MS);
  if (response === null) return { ok: false, reason: OFFLINE_SPEAK };

  const audioBase64 = typeof response.audioBase64 === 'string' ? response.audioBase64 : '';
  if (response.ok !== true || audioBase64.length === 0) {
    return { ok: false, reason: response.error ?? OFFLINE_SPEAK };
  }

  const uri = storeClip(text, audioBase64, response.mimeType ?? 'audio/mpeg');
  if (uri === null) return { ok: false, reason: 'This device could not store the announcement.' };
  return { ok: true, uri };
}

/**
 * Generates a line ahead of time without playing it, so the button that plays it
 * later never waits on a network call. Failure is silent: the caller shows the
 * text either way.
 */
export async function prewarmAnnouncement(text: string): Promise<boolean> {
  if (text.trim().length === 0) return false;
  if (cachedClipUri(text) !== null) return true;
  const clip = await generateClip(text);
  return clip.ok;
}

/**
 * Speaks a line out loud. The text is written by app code, never by a model.
 * A clip already on the device plays with no network call at all; otherwise it is
 * generated once and kept. If neither works, the reason comes back and the caller
 * keeps the line on screen as text — never a silent failure.
 */
export async function speakAnnouncement(text: string): Promise<SpeakOutcome> {
  const cached = cachedClipUri(text);
  if (cached !== null) {
    try {
      await playAnnouncement(cached);
      return { ok: true };
    } catch {
      // The stored clip could not be played; fall through and ask again.
    }
  }

  const clip = await generateClip(text);
  if (!clip.ok) return { ok: false, reason: clip.reason };

  try {
    await playAnnouncement(clip.uri);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'This device could not play the announcement.' };
  }
}

/**
 * Plays a clip straight from a link, used for the recordings kept in the archive.
 * Nothing is cached: an archived note is listened to once by whoever is reading
 * the feedback, and the link it came from expires.
 */
export async function playFromUrl(url: string): Promise<SpeakOutcome> {
  if (url.trim().length === 0) return { ok: false, reason: 'There is no recording to play.' };

  try {
    await playAnnouncement(url);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'This device could not play that recording.' };
  }
}
