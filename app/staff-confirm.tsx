import { Image, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { ChoiceRow, type ChoiceOption } from '@/components/ui/ChoiceRow';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { describeAttachment } from '@/lib/audio';
import {
  findDish,
  findStation,
  useBonaFlowStore,
  type DishAvailability,
  type Priority,
  type QueueLevel,
  type ReportAction,
} from '@/lib/store';
import { colors } from '@/lib/theme';
import {
  ACTION_OPTIONS,
  actionLabel,
  AVAILABILITY_OPTIONS,
  availabilityLabel,
  PRIORITY_OPTIONS,
  priorityLabel,
  QUEUE_OPTIONS,
  queueLabel,
} from '@/lib/stations';

/** Sentinel used by the chip rows for "the report did not say". */
const UNREPORTED = 'unreported';
/** Sentinel used by the dish row for "applies to the whole station". */
const WHOLE_STATION = 'whole_station';

const AVAILABILITY_CHOICES: readonly ChoiceOption<DishAvailability | typeof UNREPORTED>[] = [
  ...AVAILABILITY_OPTIONS.map((value) => ({ value, label: availabilityLabel(value) })),
  { value: UNREPORTED, label: 'not reported' },
];

const QUEUE_CHOICES: readonly ChoiceOption<QueueLevel | typeof UNREPORTED>[] = [
  ...QUEUE_OPTIONS.map((value) => ({ value, label: queueLabel(value) })),
  { value: UNREPORTED, label: 'not reported' },
];

const ACTION_CHOICES: readonly ChoiceOption<ReportAction>[] = ACTION_OPTIONS.map((value) => ({
  value,
  label: actionLabel(value),
}));

const PRIORITY_CHOICES: readonly ChoiceOption<Priority>[] = PRIORITY_OPTIONS.map((value) => ({
  value,
  label: priorityLabel(value),
}));

const PHOTO_SIZE = 56;

/**
 * Confirmation screen. It shows what was understood in plain language, every
 * field is editable, and nothing in the shared store changes until Confirm.
 */
export default function ConfirmReportScreen() {
  const router = useRouter();
  const stations = useBonaFlowStore((state) => state.stations);
  const draft = useBonaFlowStore((state) => state.draft);
  const patchDraft = useBonaFlowStore((state) => state.patchDraft);
  const clearDraft = useBonaFlowStore((state) => state.clearDraft);
  const commitDraft = useBonaFlowStore((state) => state.commitDraft);

  if (draft === null) {
    return (
      <Screen scroll contentClassName="gap-6 px-5 py-6">
        <Text className="text-foreground text-xl font-semibold">
          This report is no longer waiting for confirmation.
        </Text>
        <Touchable
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={{ minHeight: 60 }}
          className="bg-surface border-border items-center justify-center rounded-3xl border px-5"
        >
          <Text className="text-foreground text-lg font-semibold">Close</Text>
        </Touchable>
      </Screen>
    );
  }

  const station = findStation(stations, draft.stationId) ?? stations[0];
  const dish = findDish(station, draft.dishId);

  const stationChoices: readonly ChoiceOption<string>[] = stations.map((entry) => ({
    value: entry.id,
    label: entry.name,
  }));

  const dishChoices: readonly ChoiceOption<string>[] = [
    ...station.dishes.map((entry) => ({ value: entry.id, label: entry.name })),
    { value: WHOLE_STATION, label: 'whole station' },
  ];

  const guestsText = draft.guestsWaiting === null ? '' : String(draft.guestsWaiting);

  const confirm = () => {
    commitDraft();
    router.back();
  };

  const cancel = () => {
    clearDraft();
    router.back();
  };

  return (
    <Screen scroll keyboardAvoiding contentClassName="gap-6 px-5 py-5" bottomOffset={8}>
      <Card level="md" className="gap-2 rounded-3xl p-5">
        <MonoText className="text-foreground text-sm">Station: {station.name}</MonoText>
        <MonoText className="text-foreground text-sm">
          Dish: {dish?.name ?? 'whole station'}
        </MonoText>
        <MonoText className="text-foreground text-sm">
          Availability:{' '}
          {draft.availability === null ? 'not reported' : availabilityLabel(draft.availability)}
        </MonoText>
        <MonoText className="text-foreground text-sm">
          Queue: {draft.queue === null ? 'not reported' : queueLabel(draft.queue)}
        </MonoText>
        <MonoText className="text-foreground text-sm">
          Guests waiting:{' '}
          {draft.guestsWaiting === null ? 'not reported' : `${draft.guestsWaiting} (reported)`}
        </MonoText>
        <MonoText className="text-foreground text-sm">
          Action: {actionLabel(draft.action)} — priority {priorityLabel(draft.priority)}
        </MonoText>

        {draft.audio === null ? null : (
          <MonoText className="text-muted text-xs">{describeAttachment(draft.audio)}</MonoText>
        )}

        {draft.photoUri === null ? null : (
          <View className="flex-row items-center gap-3 pt-1">
            <Image
              source={{ uri: draft.photoUri }}
              style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12 }}
              resizeMode="cover"
              accessibilityLabel="Attached tray photo"
            />
            <MonoText className="text-muted text-xs">tray photo attached</MonoText>
          </View>
        )}
      </Card>

      <Text className="text-muted text-sm">
        Nothing changes for guests or operations until you confirm. Every field can be corrected
        first.
      </Text>

      <View className="gap-5">
        <ChoiceRow
          label="Station"
          options={stationChoices}
          value={station.id}
          onSelect={(stationId) => patchDraft({ stationId, dishId: null })}
        />

        <ChoiceRow
          label="Dish"
          options={dishChoices}
          value={draft.dishId ?? WHOLE_STATION}
          onSelect={(value) =>
            patchDraft({
              dishId: value === WHOLE_STATION ? null : value,
              // Availability can only be applied to a named dish.
              availability: value === WHOLE_STATION ? null : draft.availability,
            })
          }
        />

        <ChoiceRow
          label="Availability"
          options={AVAILABILITY_CHOICES}
          value={draft.availability ?? UNREPORTED}
          onSelect={(value) => patchDraft({ availability: value === UNREPORTED ? null : value })}
        />

        <ChoiceRow
          label="Queue"
          options={QUEUE_CHOICES}
          value={draft.queue ?? UNREPORTED}
          onSelect={(value) => patchDraft({ queue: value === UNREPORTED ? null : value })}
        />

        <View className="gap-2">
          <Text className="text-muted text-xs font-semibold uppercase">Guests waiting</Text>
          <TextInput
            value={guestsText}
            onChangeText={(next) => {
              const digits = next.replace(/[^0-9]/g, '');
              patchDraft({ guestsWaiting: digits === '' ? null : Number.parseInt(digits, 10) });
            }}
            keyboardType="number-pad"
            placeholder="not reported"
            placeholderTextColor={colors.muted}
            className="border-border bg-surface text-foreground rounded-2xl border px-4 text-base"
            style={{ minHeight: 52 }}
            accessibilityLabel="Guests waiting"
          />
        </View>

        <ChoiceRow
          label="Action"
          options={ACTION_CHOICES}
          value={draft.action}
          onSelect={(action) => patchDraft({ action })}
        />

        <ChoiceRow
          label="Priority"
          options={PRIORITY_CHOICES}
          value={draft.priority}
          onSelect={(priority) => patchDraft({ priority })}
        />

        <View className="gap-2">
          <Text className="text-muted text-xs font-semibold uppercase">Note</Text>
          <TextInput
            value={draft.note}
            onChangeText={(note) => patchDraft({ note })}
            multiline
            placeholder="What should the team know?"
            placeholderTextColor={colors.muted}
            className="border-border bg-surface text-foreground rounded-2xl border p-4 text-base"
            style={{ minHeight: 96, textAlignVertical: 'top' }}
            accessibilityLabel="Note"
          />
        </View>
      </View>

      <View className="gap-3 pt-1">
        <Touchable
          accessibilityLabel="Confirm this update"
          onPress={confirm}
          style={{ minHeight: 64 }}
          className="bg-accent items-center justify-center rounded-3xl px-5"
        >
          <Text className="text-accent-foreground text-lg font-semibold">Confirm</Text>
        </Touchable>

        <Touchable
          accessibilityLabel="Cancel this update"
          onPress={cancel}
          style={{ minHeight: 60 }}
          className="bg-surface border-border items-center justify-center rounded-3xl border px-5"
        >
          <Text className="text-foreground text-lg font-semibold">Cancel</Text>
        </Touchable>
      </View>
    </Screen>
  );
}
