import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { PermissionNotice } from '@/components/staff/PermissionNotice';
import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { useBonaFlowStore } from '@/lib/store';

/**
 * Joining the event by its QR code.
 *
 * Scanning is the convenience, never the dependency: "Enter Demo Event" is on
 * this screen from the first frame and works with the camera denied, the camera
 * missing, a browser that cannot scan, or a code that belongs to another event.
 * Nothing about the demo is behind the camera.
 */

const CAMERA_DENIED =
  'Camera access is off, so the event code cannot be scanned. Enter the demo event instead.';
const CAMERA_UNAVAILABLE =
  'This device cannot scan a code here. Enter the demo event instead — it is the same event.';

/** The scanned payload has to name this event. Anything else is not ours. */
const EVENT_CODE = 'bonaflow';

const VIEWFINDER_HEIGHT = 260;

export default function JoinEventScreen() {
  const router = useRouter();
  const event = useBonaFlowStore((state) => state.event);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);

  // A browser tab has no reliable code scanner, so it goes straight to the
  // fallback rather than showing a viewfinder that can never succeed.
  const canScan = Platform.OS !== 'web';
  const granted = permission?.granted === true;
  const denied = permission !== null && !permission.granted && !permission.canAskAgain;

  const enterEvent = () => {
    router.replace('/');
  };

  const handleScan = (data: string) => {
    if (scanned !== null) return;
    setScanned(data);
    if (data.toLowerCase().includes(EVENT_CODE)) {
      enterEvent();
      return;
    }
    setMismatch(true);
  };

  return (
    <Screen scroll contentClassName="gap-6 px-6 py-6">
      <View className="gap-2">
        <Text className="text-foreground text-2xl font-semibold">Join the event</Text>
        <Text className="text-muted text-base">
          Scan the code on the station signage, or enter the demo event directly.
        </Text>
      </View>

      {!canScan ? (
        <PermissionNotice message={CAMERA_UNAVAILABLE} />
      ) : denied ? (
        <PermissionNotice message={CAMERA_DENIED} />
      ) : granted ? (
        <Card level="sm" className="overflow-hidden rounded-3xl p-0">
          <View style={{ height: VIEWFINDER_HEIGHT }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => handleScan(data)}
            />
          </View>
        </Card>
      ) : (
        <Touchable
          accessibilityLabel="Allow the camera and scan the event code"
          onPress={() => void requestPermission()}
          style={{ minHeight: 60 }}
          className="border-border bg-surface items-center justify-center rounded-3xl border px-5"
        >
          <Text className="text-foreground text-lg font-semibold">Scan event code</Text>
        </Touchable>
      )}

      {mismatch ? (
        <MonoText className="text-muted text-[11px]">
          that code belongs to another event · enter the demo event instead
        </MonoText>
      ) : null}

      <Touchable
        accessibilityLabel="Enter Demo Event"
        onPress={enterEvent}
        style={{ minHeight: 68 }}
        className="bg-accent items-center justify-center rounded-3xl px-6"
      >
        <Text className="text-accent-foreground text-xl font-semibold">Enter Demo Event</Text>
      </Touchable>

      <View className="gap-1">
        <Text className="text-muted text-base">{event.name}</Text>
        <MonoText className="text-muted text-xs">
          {event.venue} · lunch {event.serviceStart}–{event.serviceEnd}
        </MonoText>
      </View>
    </Screen>
  );
}
