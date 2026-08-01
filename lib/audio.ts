import type { AudioAttachment } from '@/lib/store';

/**
 * Container handling for recordings.
 *
 * iOS writes .m4a, Android writes .m4a or .3gp depending on the device, and the
 * web recorder produces a blob with no extension at all. Nothing here is
 * hardcoded: the container is read from the URI the recorder actually returned
 * and passed through as-is, so whatever arrives is what gets sent.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  '3gp': 'audio/3gpp',
  '3gpp': 'audio/3gpp',
  amr: 'audio/amr',
  caf: 'audio/x-caf',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
};

/** Extension of the file the recorder produced, or '' when there is none. */
function readExtension(uri: string): string {
  const withoutQuery = uri.split('?')[0].split('#')[0];
  const lastSegment = withoutQuery.split('/').pop() ?? '';
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex === -1) return '';
  const candidate = lastSegment.slice(dotIndex + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(candidate) ? candidate : '';
}

export function describeRecording(uri: string, durationMs: number): AudioAttachment {
  const extension = readExtension(uri);

  return {
    uri,
    extension,
    // Unknown containers keep a generic type rather than a guessed one, so the
    // receiving end can accept whatever the device produced.
    mimeType: MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
    durationMs,
  };
}

/** "0:07" */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** "voice note · 0:07 · audio/mp4" */
export function describeAttachment(audio: AudioAttachment): string {
  return `voice note · ${formatDuration(audio.durationMs)} · ${audio.mimeType}`;
}
