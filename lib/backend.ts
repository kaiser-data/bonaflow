import { createClient } from '@biltme/backend';

/**
 * Backend client for the shared event state.
 *
 * There are no users, accounts or sessions in BonaFlow: every device reads and
 * writes the same single event dataset, so session persistence and token
 * refreshing are switched off deliberately.
 */

const url = process.env.EXPO_PUBLIC_BILT_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_BILT_ANON_KEY ?? '';

/** False on a build without backend credentials; the app then stays local-only. */
export const backendConfigured = url.length > 0 && anonKey.length > 0;

export const bilt = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
