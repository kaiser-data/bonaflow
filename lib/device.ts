import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Anonymous device identity.
 *
 * There are no accounts in this app and no sign-in step: a guest walks up, scans
 * the QR code and starts using it. Ratings and points therefore hang off a random
 * id generated on the phone and kept in local storage. It identifies the device,
 * not the person — no name, no email, nothing that could be traced back to a
 * guest — and it exists only so that the same phone cannot earn points by rating
 * one bowl over and over, and so the phone can show the points it has earned.
 */

const STORAGE_KEY = 'bonaflow.deviceId';

function mint(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `device-${Date.now().toString(36)}-${random}`;
}

/**
 * Held in memory so a rating can be stamped without awaiting storage. A fresh id
 * is minted immediately; if the phone already had one, `ensureDeviceId` swaps it
 * in on the first render, well before anyone can submit anything.
 */
let current = mint();
let loaded = false;

export function deviceId(): string {
  return current;
}

/**
 * Restores this phone's id, or writes the freshly minted one. Safe to call more
 * than once and safe to fail: a device that cannot reach storage simply keeps the
 * id it has for this session instead of losing its points silently mid-lunch.
 */
export async function ensureDeviceId(): Promise<string> {
  if (loaded) return current;
  loaded = true;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== null && stored.length > 0) {
      current = stored;
      return current;
    }
    await AsyncStorage.setItem(STORAGE_KEY, current);
  } catch {
    // Storage unavailable. The in-memory id still works for this session.
  }

  return current;
}
