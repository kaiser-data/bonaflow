import { Text, View } from 'react-native';

import { AnnounceButton } from '@/components/ops/AnnounceButton';
import { PhotoEvidence } from '@/components/ops/PhotoEvidence';
import { ReadingRows } from '@/components/ops/ReadingRows';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { announcementForAlert } from '@/lib/announce';
import { formatAge } from '@/lib/clock';
import { OFFLINE_INTERPRETATION_LABEL } from '@/lib/interpret';
import {
  formatClock,
  issueTypeLabel,
  priorityColor,
  priorityLabel,
  issueTypeFor,
} from '@/lib/stations';
import {
  findDish,
  findStation,
  type Incentive,
  type StaffUpdate,
  type Station,
  type StationAlert,
} from '@/lib/store';

export type AlertCardProps = {
  alert: StationAlert;
  /** The staff report this alert came from, when it is still in the feed. */
  update: StaffUpdate | null;
  stations: readonly Station[];
  incentive: Incentive | null;
};

/**
 * One alert: what happened, what to do, what was said versus what was concluded,
 * and where guests are being sent instead.
 *
 * The redirection shown here is the one the app verified in plain code. When the
 * reading service suggested a different station, that is stated, because a
 * suggestion that failed the availability check is exactly the kind of thing a
 * lead needs to see rather than a silent correction.
 */
export function AlertCard({ alert, update, stations, incentive }: AlertCardProps) {
  const station = findStation(stations, alert.stationId);
  const dish = findDish(station, alert.dishId);
  const interpretation = update?.interpretation ?? null;
  const issueType = interpretation?.issueType ?? (update === null ? 'other' : issueTypeFor(update));
  const announcement = announcementForAlert({ alert, update, stations, incentive });
  const suggested = findStation(stations, interpretation?.suggestedStationId ?? null);

  return (
    <Card level="sm" className="border-border gap-3 rounded-3xl border p-4">
      <View className="flex-row items-center gap-2">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: priorityColor(alert.priority),
          }}
        />
        <MonoText className="text-muted flex-1 text-[11px]">
          {formatClock(alert.createdAt)} · {formatAge(alert.createdAt)} · priority{' '}
          {priorityLabel(alert.priority)} · {issueTypeLabel(issueType)}
        </MonoText>
      </View>

      <Text className="text-foreground text-base">{alert.message}</Text>
      <MonoText className="text-foreground text-[11px]">
        recommended action: {alert.recommendedAction}
        {dish === undefined ? '' : ` · ${dish.name}`}
      </MonoText>

      {update === null ? (
        <MonoText className="text-muted text-[11px]">
          the report behind this alert is no longer in the feed
        </MonoText>
      ) : (
        <ReadingRows update={update} />
      )}

      <View className="border-separator gap-1 border-t pt-3">
        <MonoText className="text-muted text-[10px] font-semibold">GUEST REDIRECTION</MonoText>
        {announcement.target === null ? (
          <MonoText className="text-muted text-[11px]">
            no station has a matching dish available · guests are not redirected
          </MonoText>
        ) : (
          <>
            <MonoText className="text-foreground text-[11px]">
              Station {announcement.target.code} · {announcement.target.dishName}
            </MonoText>
            <MonoText className="text-muted text-[11px]">
              {announcement.targetSource === 'model'
                ? 'suggested by the reading service, verified available here'
                : 'chosen by the deterministic For You rule'}
              {suggested === undefined || announcement.targetSource === 'model'
                ? ''
                : ` · suggestion was Station ${suggested.code}, which had no matching dish available`}
            </MonoText>
          </>
        )}
        {announcement.incentiveApplied ? (
          <MonoText className="text-muted text-[11px]">
            the operations incentive is included in the announcement
          </MonoText>
        ) : null}
      </View>

      {interpretation === null ? null : (
        <View className="gap-1">
          {interpretation.mode === 'keyword' ? (
            <MonoText className="text-muted text-[11px]">{OFFLINE_INTERPRETATION_LABEL}</MonoText>
          ) : (
            <MonoText className="text-muted text-[11px]">
              read by the reading service · {Math.round(interpretation.confidence * 100)}% confident
            </MonoText>
          )}
          {interpretation.suggestedAction.length === 0 ? null : (
            <MonoText className="text-muted text-[11px]">
              service suggested: {interpretation.suggestedAction}
            </MonoText>
          )}
          {interpretation.suggestedAnnouncement.length === 0 ? null : (
            <MonoText className="text-muted text-[11px]">
              service wording, not spoken: “{interpretation.suggestedAnnouncement}”
            </MonoText>
          )}
          {interpretation.corrections.map((correction) => (
            <MonoText key={correction} className="text-muted text-[11px]">
              corrected: {correction}
            </MonoText>
          ))}
        </View>
      )}

      {update?.photoUri == null ? null : <PhotoEvidence uri={update.photoUri} />}

      <View className="gap-2">
        <Text className="text-foreground text-sm">{announcement.en}</Text>
        <Text className="text-foreground text-sm">{announcement.de}</Text>
        <View className="flex-row flex-wrap gap-2">
          <AnnounceButton text={announcement.en} label="Announce (EN)" />
          <AnnounceButton text={announcement.de} label="Ansage (DE)" />
        </View>
      </View>
    </Card>
  );
}
