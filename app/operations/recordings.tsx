import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Text, View } from 'react-native';
import { Download, FileDown, Play, Square } from 'lucide-react-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { useLivePoll } from '@/hooks/useLivePoll';
import { formatAge } from '@/lib/clock';
import {
  exportTranscripts,
  recordingKindLabel,
  recordingLanguageLabel,
  recordingLink,
  recordingStatusLine,
  storedCount,
  totalDuration,
  transcriptSourceLabel,
} from '@/lib/recordings';
import { formatClock } from '@/lib/stations';
import { findDish, findStation, useBonaFlowStore, type VoiceRecording } from '@/lib/store';
import { colors } from '@/lib/theme';
import { playFromUrl, stopSpeaking } from '@/lib/voice';

/**
 * The archive: every voice note, with the words that were stored with it.
 *
 * Recordings do not live on the phone that made them. They are uploaded to the
 * backend the moment a review or a report is confirmed, which is what makes this
 * screen possible at all — a service ends, the phones walk out of the building,
 * and what people actually said is still here to be listened to and downloaded.
 *
 * Two honest states are visible rather than hidden: a note still going up says so,
 * and one whose audio could not be stored shows the reason with its transcript
 * intact. Links are signed and expire, so nothing here is a permanent public URL.
 */
export default function OperationsRecordingsScreen() {
  const recordings = useBonaFlowStore((state) => state.recordings);
  const stations = useBonaFlowStore((state) => state.stations);
  const lastSyncedAt = useBonaFlowStore((state) => state.lastSyncedAt);
  const poll = useLivePoll();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportState, setExportState] = useState<{ url: string; rows: number } | null>(null);
  const [exporting, setExporting] = useState(false);

  const summary = useMemo(
    () => ({
      total: recordings.length,
      stored: storedCount(recordings),
      duration: totalDuration(recordings),
    }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- poll.revision intentionally forces a recompute on the 3s live poll fallback.
    [recordings, poll.revision],
  );

  const describe = useCallback(
    (recording: VoiceRecording) => {
      const station = findStation(stations, recording.stationId);
      const dish =
        station === null || recording.dishId === null ? null : findDish(station, recording.dishId);
      return [station?.name ?? recording.stationId, dish?.name].filter(Boolean).join(' · ');
    },
    [stations],
  );

  const play = async (recording: VoiceRecording) => {
    if (recording.storagePath === null) return;

    if (playingId === recording.id) {
      stopSpeaking();
      setPlayingId(null);
      return;
    }

    setBusyId(recording.id);
    setNotice(null);
    const link = await recordingLink(recording.storagePath);
    setBusyId(null);
    if (!link.ok) {
      setNotice(link.reason);
      return;
    }

    setPlayingId(recording.id);
    const played = await playFromUrl(link.url);
    setPlayingId(null);
    if (!played.ok) setNotice(played.reason);
  };

  const download = async (recording: VoiceRecording) => {
    if (recording.storagePath === null) return;

    setBusyId(recording.id);
    setNotice(null);
    const link = await recordingLink(recording.storagePath);
    setBusyId(null);
    if (!link.ok) {
      setNotice(link.reason);
      return;
    }

    await openLink(link.url);
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setNotice('That link could not be opened on this device.');
    }
  };

  const runExport = async () => {
    setExporting(true);
    setNotice(null);
    const result = await exportTranscripts();
    setExporting(false);
    if (!result.ok) {
      setNotice(result.reason);
      return;
    }
    setExportState({ url: result.url, rows: result.rows });
  };

  return (
    <Screen edges={['left', 'right']}>
      <FlatList
        data={recordings}
        keyExtractor={(recording) => recording.id}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-5">
            <View className="gap-1">
              <Text className="text-foreground text-2xl font-semibold">Voice archive</Text>
              <MonoText className="text-muted text-xs">
                {summary.total} {summary.total === 1 ? 'note' : 'notes'} · {summary.stored} with
                audio stored · {summary.duration} total ·{' '}
                {lastSyncedAt === null ? 'not synced yet' : `synced ${formatClock(lastSyncedAt)}`}
              </MonoText>
            </View>

            <Card level="sm" className="gap-3 rounded-3xl p-4">
              <Text className="text-foreground text-base font-semibold">
                Download every transcript
              </Text>
              <Text className="text-muted text-sm">
                One CSV with each guest review and staff note, the language it was said in, and the
                path of the recording it came from, so audio and words can be matched afterwards.
              </Text>

              <Touchable
                accessibilityLabel="Export every transcript as a CSV file"
                accessibilityState={{ disabled: exporting }}
                disabled={exporting}
                onPress={() => void runExport()}
                style={{ minHeight: 48 }}
                className="bg-accent flex-row items-center justify-center gap-2 rounded-2xl px-4"
              >
                <FileDown color={colors.background} size={18} />
                <Text className="text-accent-foreground text-base font-semibold">
                  {exporting ? 'Writing the file…' : 'Export transcripts'}
                </Text>
              </Touchable>

              {exportState === null ? null : (
                <View className="gap-2">
                  <MonoText className="text-muted text-[11px]">
                    {exportState.rows} {exportState.rows === 1 ? 'row' : 'rows'} · link valid for 24
                    hours
                  </MonoText>
                  <Touchable
                    accessibilityLabel="Open the exported CSV file"
                    onPress={() => void openLink(exportState.url)}
                    style={{ minHeight: 44 }}
                    className="border-border bg-background flex-row items-center justify-center gap-2 rounded-2xl border px-4"
                  >
                    <Download color={colors.foreground} size={18} />
                    <Text className="text-foreground text-sm font-semibold">Open the CSV</Text>
                  </Touchable>
                </View>
              )}
            </Card>

            {notice === null ? null : (
              <Card level="sm" className="rounded-3xl p-4">
                <Text className="text-foreground text-sm">{notice}</Text>
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text className="text-muted text-base">
            No voice notes yet. A guest review or a staff report spoken into the app appears here
            with its audio and its transcript, without anyone refreshing.
          </Text>
        }
        renderItem={({ item }) => (
          <RecordingCard
            recording={item}
            where={describe(item)}
            busy={busyId === item.id}
            playing={playingId === item.id}
            onPlay={() => void play(item)}
            onDownload={() => void download(item)}
          />
        )}
        ListFooterComponent={
          recordings.length === 0 ? null : (
            <Text className="text-muted text-xs">
              Recordings are stored in the backend against an anonymous device id, never a person.
              Every link is signed and expires, so nothing here is a public address.
            </Text>
          )
        }
      />
    </Screen>
  );
}

function RecordingCard({
  recording,
  where,
  busy,
  playing,
  onPlay,
  onDownload,
}: {
  recording: VoiceRecording;
  where: string;
  busy: boolean;
  playing: boolean;
  onPlay: () => void;
  onDownload: () => void;
}) {
  const hasAudio = recording.storagePath !== null;

  return (
    <Card level="md" className="gap-3 rounded-3xl p-5">
      <View className="gap-0.5">
        <Text className="text-foreground text-base font-semibold">
          {recordingKindLabel(recording.kind)}
        </Text>
        <MonoText className="text-muted text-[11px]">
          {where} · {formatClock(recording.createdAt)} · {formatAge(recording.createdAt)}
        </MonoText>
      </View>

      <View className="gap-1">
        {recording.transcript.length === 0 ? (
          <Text className="text-muted text-sm">
            No words were stored with this note — only the recording.
          </Text>
        ) : (
          <Text className="text-foreground text-sm">“{recording.transcript}”</Text>
        )}
        <MonoText className="text-muted text-[10px]">
          {transcriptSourceLabel(recording.transcriptSource)} ·{' '}
          {recordingLanguageLabel(recording.language)}
        </MonoText>
      </View>

      <View className="border-separator gap-3 border-t pt-3">
        <MonoText className="text-muted text-[11px]">{recordingStatusLine(recording)}</MonoText>

        {!hasAudio ? null : (
          <View className="flex-row gap-2">
            <Touchable
              accessibilityLabel={playing ? 'Stop this recording' : 'Play this recording'}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onPlay}
              style={{ minHeight: 44 }}
              className="border-border bg-background flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-4"
            >
              {playing ? (
                <Square color={colors.foreground} size={16} />
              ) : (
                <Play color={colors.foreground} size={16} />
              )}
              <Text className="text-foreground text-sm font-semibold">
                {busy ? 'Opening…' : playing ? 'Stop' : 'Play'}
              </Text>
            </Touchable>

            <Touchable
              accessibilityLabel="Download this recording"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onDownload}
              style={{ minHeight: 44 }}
              className="border-border bg-background flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-4"
            >
              <Download color={colors.foreground} size={16} />
              <Text className="text-foreground text-sm font-semibold">Download</Text>
            </Touchable>
          </View>
        )}
      </View>
    </Card>
  );
}
