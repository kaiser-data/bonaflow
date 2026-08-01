import { formatDuration, readAudioBase64 } from '@/lib/audio';
import { backendConfigured, bilt } from '@/lib/backend';
import type { AudioAttachment, VoiceRecording } from '@/lib/store';

/**
 * The voice archive.
 *
 * Everything a guest or a staff member said is kept in the backend rather than on
 * the phone that recorded it: the audio in a private bucket, the transcript in a
 * row next to it, both reachable afterwards for analysis. The phone only ever
 * holds a recording for the seconds between releasing the button and the upload.
 *
 * Access goes through the `voice-archive` function, never through a bucket path
 * in the app: the archive is written and read with a service key that exists only
 * on the server, so recordings cannot be listed or fetched with the app's public
 * key. Links are signed and time-limited.
 *
 * Failure never costs the words. If the audio cannot be read or stored, the
 * transcript row is still written with the reason on it, and the screen says so
 * instead of showing a recording that is not there.
 */

/** Uploading a note is not interactive, so this is generous rather than snappy. */
const SAVE_TIMEOUT_MS = 45000;
const LINK_TIMEOUT_MS = 15000;
const EXPORT_TIMEOUT_MS = 30000;

const OFFLINE = 'The archive could not be reached, so try again in a moment.';

type ArchiveResponse = {
  ok?: boolean;
  error?: string;
  path?: string | null;
  stored?: string;
  warning?: string | null;
  url?: string;
  rows?: number;
  expiresInSeconds?: number;
};

/** 'retry' means the archive was unreachable; 'drop' means it refused the call. */
export type ArchiveOutcome = 'ok' | 'retry' | 'drop';

export type LinkOutcome = { ok: true; url: string } | { ok: false; reason: string };
export type ExportOutcome = { ok: true; url: string; rows: number } | { ok: false; reason: string };

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
async function callArchive(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<ArchiveResponse | null> {
  if (!backendConfigured) return null;

  const request = (async (): Promise<ArchiveResponse | null> => {
    try {
      const { data, error } = await bilt.functions.invoke<ArchiveResponse>('voice-archive', {
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
 * Files one voice note. The audio is read off the device and sent with the row,
 * so the archive holds the bytes rather than a `file://` path that means nothing
 * on another device tomorrow.
 *
 * A recording that cannot be read is still filed as a transcript: the row records
 * that the audio is missing and why.
 */
export async function archiveRecording(
  recording: VoiceRecording,
  audio: AudioAttachment,
): Promise<ArchiveOutcome> {
  const audioBase64 = await readAudioBase64(audio.uri);

  const response = await callArchive(
    {
      action: 'save',
      id: recording.id,
      kind: recording.kind,
      refId: recording.refId,
      deviceId: recording.deviceId,
      stationId: recording.stationId,
      dishId: recording.dishId,
      transcript: recording.transcript,
      transcriptSource: recording.transcriptSource,
      language: recording.language,
      durationMs: recording.durationMs,
      mimeType: recording.mimeType,
      extension: recording.extension,
      createdAt: recording.createdAt,
      audioBase64: audioBase64 ?? '',
    },
    SAVE_TIMEOUT_MS,
  );

  if (response === null) return 'retry';
  return response.ok === true ? 'ok' : 'drop';
}

/** A signed link to one recording, for playing it or downloading the file. */
export async function recordingLink(path: string): Promise<LinkOutcome> {
  const response = await callArchive({ action: 'link', path }, LINK_TIMEOUT_MS);
  if (response === null) return { ok: false, reason: OFFLINE };

  const url = typeof response.url === 'string' ? response.url : '';
  if (response.ok !== true || url.length === 0) {
    return { ok: false, reason: response.error ?? OFFLINE };
  }

  return { ok: true, url };
}

/**
 * Writes every transcript — guest reviews and staff notes, with the path of the
 * audio each came from — into one CSV and returns a link to it.
 */
export async function exportTranscripts(): Promise<ExportOutcome> {
  const response = await callArchive({ action: 'export' }, EXPORT_TIMEOUT_MS);
  if (response === null) return { ok: false, reason: OFFLINE };

  const url = typeof response.url === 'string' ? response.url : '';
  if (response.ok !== true || url.length === 0) {
    return { ok: false, reason: response.error ?? OFFLINE };
  }

  return { ok: true, url, rows: typeof response.rows === 'number' ? response.rows : 0 };
}

export function recordingKindLabel(kind: VoiceRecording['kind']): string {
  return kind === 'guest_rating' ? 'Guest review' : 'Staff update';
}

export function transcriptSourceLabel(source: VoiceRecording['transcriptSource']): string {
  if (source === 'voice_service') return 'transcribed';
  if (source === 'typed') return 'typed by hand';
  return 'no words kept';
}

export function recordingLanguageLabel(language: VoiceRecording['language']): string {
  if (language === 'de') return 'German';
  if (language === 'en') return 'English';
  return 'language not recorded';
}

/**
 * One honest line about the audio itself. A note still on its way up says so
 * rather than looking broken, and one that failed says why.
 */
export function recordingStatusLine(recording: VoiceRecording): string {
  if (recording.storagePath !== null) {
    const size =
      recording.bytes === null ? '' : ` · ${Math.max(1, Math.round(recording.bytes / 1024))} KB`;
    return `audio stored · ${formatDuration(recording.durationMs)}${size}`;
  }

  if (recording.uploadError !== null) return recording.uploadError;
  return 'audio still uploading — the words are already saved';
}

/** How many of these notes have their audio in the archive. */
export function storedCount(recordings: readonly VoiceRecording[]): number {
  return recordings.filter((recording) => recording.storagePath !== null).length;
}

/** Total length of every note, as "3:20". */
export function totalDuration(recordings: readonly VoiceRecording[]): string {
  return formatDuration(
    recordings.reduce((total, recording) => total + Math.max(0, recording.durationMs), 0),
  );
}
