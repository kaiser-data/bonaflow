import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DishChooser } from '@/components/staff/DishChooser';
import { HoldToTalkButton } from '@/components/staff/HoldToTalkButton';
import { PermissionNotice } from '@/components/staff/PermissionNotice';
import { QuickActionGrid } from '@/components/staff/QuickActionGrid';
import { StationPickerGrid } from '@/components/staff/StationPickerGrid';
import { TrayPhotoPicker } from '@/components/staff/TrayPhotoPicker';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import type { PhotoSource } from '@/lib/photos';
import {
  buildQuickActionDraft,
  buildVoiceDraft,
  interpretReport,
  PERMISSION_FALLBACK_TEXT,
  type QuickAction,
} from '@/lib/reports';
import { findStation, useBonaFlowStore, type AudioAttachment } from '@/lib/store';
import { formatClock } from '@/lib/stations';
import { colors } from '@/lib/theme';
import { transcribeVoiceNote } from '@/lib/voice';

const MICROPHONE_DENIED =
  'Microphone access is off, so this update is typed instead. The text below is ready to send.';

const PHOTO_DENIED: Record<PhotoSource, string> = {
  camera: 'Camera access is off, so this update is typed instead. The text below is ready to send.',
  library:
    'Photo library access is off, so this update is typed instead. The text below is ready to send.',
};

export default function StaffReportScreen() {
  const router = useRouter();
  const stations = useBonaFlowStore((state) => state.stations);
  const selectedStationId = useBonaFlowStore((state) => state.selectedStationId);
  const selectStation = useBonaFlowStore((state) => state.selectStation);
  const applyReport = useBonaFlowStore((state) => state.applyReport);
  const startDraft = useBonaFlowStore((state) => state.startDraft);
  const alerts = useBonaFlowStore((state) => state.alerts);

  const [text, setText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);

  const station = findStation(stations, selectedStationId) ?? stations[0];
  const lastAlert = alerts.length > 0 ? alerts[0] : null;

  /** Quick actions apply straight away — no model, no network, no waiting. */
  const runQuickAction = (quickAction: QuickAction, dishId: string | null) => {
    applyReport({ ...buildQuickActionDraft(quickAction, station.id, dishId), photoUri });
    setPendingAction(null);
    setPhotoUri(null);
  };

  const handleQuickAction = (quickAction: QuickAction) => {
    if (quickAction.scope === 'dish') {
      setPendingAction(quickAction);
      return;
    }
    runQuickAction(quickAction, null);
  };

  /** Text and voice always go through the confirmation screen first. */
  const reviewText = () => {
    startDraft(
      interpretReport({ text, stations, stationId: station.id, source: 'text', photoUri }),
    );
    router.push('/staff-confirm');
  };

  const reviewVoiceNote = async (audio: AudioAttachment) => {
    setVoiceHint(null);
    setTranscribing(true);
    // The recording goes to the server-side voice service; the API key is never
    // in this app. A transcript only supplies the words — the fields are still
    // worked out by the deterministic interpreter and confirmed by hand.
    const transcript = await transcribeVoiceNote(audio);
    setTranscribing(false);

    if (transcript.ok) {
      startDraft(
        interpretReport({
          text: transcript.text,
          stations,
          stationId: station.id,
          source: 'voice',
          photoUri,
          audio,
        }),
      );
      router.push('/staff-confirm');
      return;
    }

    // No transcript: the note is kept and the fields are filled in on the
    // confirmation screen, so the demo survives a dead network.
    setVoiceHint(transcript.reason);
    startDraft({ ...buildVoiceDraft({ stationId: station.id, dishId: null, audio }), photoUri });
    router.push('/staff-confirm');
  };

  /** Denied or unavailable hardware falls back to the pre-filled text field. */
  const fallBackToText = (message: string) => {
    setNotice(message);
    setText(PERMISSION_FALLBACK_TEXT);
  };

  return (
    <Screen scroll keyboardAvoiding edges={['left', 'right']} contentClassName="gap-8 px-5 py-4">
      <View className="gap-3">
        <Text className="text-foreground text-2xl font-semibold">Which station?</Text>
        <StationPickerGrid
          stations={stations}
          selectedStationId={station.id}
          onSelect={selectStation}
        />
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-2xl font-semibold">Quick actions</Text>
        <MonoText className="text-muted text-xs">applies immediately · works offline</MonoText>
        <QuickActionGrid onSelect={handleQuickAction} />
      </View>

      {lastAlert === null ? null : (
        <Card level="sm" className="gap-2 rounded-3xl p-4">
          <MonoText className="text-muted text-xs">
            saved {formatClock(lastAlert.createdAt)}
          </MonoText>
          <Text className="text-foreground text-base">{lastAlert.message}</Text>
          <MonoText className="text-muted text-xs">{lastAlert.recommendedAction}</MonoText>
        </Card>
      )}

      <View className="gap-3">
        <Text className="text-foreground text-2xl font-semibold">Say more</Text>

        {notice === null ? null : <PermissionNotice message={notice} />}

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder={`What changed at ${station.name}?`}
          placeholderTextColor={colors.muted}
          className="border-border bg-surface text-foreground rounded-3xl border p-4 text-base"
          style={{ minHeight: 112, textAlignVertical: 'top' }}
          accessibilityLabel="Free-text update"
        />

        <Touchable
          accessibilityLabel="Review this update"
          accessibilityState={{ disabled: text.trim().length === 0 }}
          disabled={text.trim().length === 0}
          onPress={reviewText}
          style={{ minHeight: 60 }}
          className={
            text.trim().length === 0
              ? 'bg-surface border-border items-center justify-center rounded-3xl border px-5'
              : 'bg-accent items-center justify-center rounded-3xl px-5'
          }
        >
          <Text
            className={
              text.trim().length === 0
                ? 'text-muted text-lg font-semibold'
                : 'text-accent-foreground text-lg font-semibold'
            }
          >
            Review update
          </Text>
        </Touchable>

        <HoldToTalkButton
          onRecorded={(audio) => void reviewVoiceNote(audio)}
          onUnavailable={() => fallBackToText(MICROPHONE_DENIED)}
        />

        {transcribing ? (
          <MonoText className="text-muted text-xs">turning that note into text…</MonoText>
        ) : null}

        {voiceHint === null ? null : (
          <MonoText className="text-muted text-xs">{voiceHint}</MonoText>
        )}
      </View>

      <View className="gap-3">
        <Text className="text-foreground text-2xl font-semibold">Tray photo</Text>
        <TrayPhotoPicker
          photoUri={photoUri}
          onPicked={setPhotoUri}
          onRemove={() => setPhotoUri(null)}
          onDenied={(source) => fallBackToText(PHOTO_DENIED[source])}
        />
      </View>

      <DishChooser
        visible={pendingAction !== null}
        title={pendingAction === null ? '' : `${pendingAction.label} — which dish?`}
        dishes={station.dishes}
        onSelect={(dishId) => {
          if (pendingAction === null) return;
          runQuickAction(pendingAction, dishId);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </Screen>
  );
}
