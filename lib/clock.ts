/**
 * Demo event clock.
 *
 * All seeded timestamps sit inside the demo lunch window (12:30–14:00 on the
 * event day), so comparing them against the device's real clock would make
 * every task look hours old and the seeded incentive look expired.
 *
 * `eventNow()` therefore returns the event epoch plus the real time elapsed
 * since the app started: it advances exactly like a wall clock, works with no
 * network, and stays consistent for ages, expiry checks and new timestamps.
 * Swapping this for `new Date()` is the only change needed once real data
 * arrives.
 */

const EVENT_EPOCH_ISO = '2026-06-11T12:55:00';

let epochMs = new Date(EVENT_EPOCH_ISO).getTime();
let bootMs = Date.now();

export function eventNow(): Date {
  return new Date(epochMs + (Date.now() - bootMs));
}

/**
 * Keeps the demo clock in step with the other devices.
 *
 * Each device starts its event clock when the app opens, so a phone opened later
 * would otherwise be minutes behind and stamp new reports with times older than
 * the ones already stored. Feeding the newest timestamp seen from the backend in
 * here moves this device forward to match; it never moves backwards.
 */
export function syncEventClock(isoTimestamp: string): void {
  const parsed = new Date(isoTimestamp).getTime();
  if (Number.isNaN(parsed)) return;
  if (parsed > eventNow().getTime()) {
    epochMs = parsed;
    bootMs = Date.now();
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local ISO string without timezone, matching the seeded timestamp format. */
export function toLocalIso(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function eventNowIso(): string {
  return toLocalIso(eventNow());
}

/** Whole minutes between an ISO timestamp and the event clock. Never negative. */
export function minutesSince(isoTimestamp: string): number {
  const parsed = new Date(isoTimestamp).getTime();
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.floor((eventNow().getTime() - parsed) / 60_000));
}

/** Compact age label, e.g. "just now", "4 min", "1 h 12 min". */
export function formatAge(isoTimestamp: string): string {
  const minutes = minutesSince(isoTimestamp);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${pad(minutes % 60)} min`;
}

/** True when the ISO timestamp is still in the future on the event clock. */
export function isStillValid(isoTimestamp: string): boolean {
  const parsed = new Date(isoTimestamp).getTime();
  if (Number.isNaN(parsed)) return false;
  return parsed > eventNow().getTime();
}
