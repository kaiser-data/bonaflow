import { createClient } from '@biltme/backend';
import Constants from 'expo-constants';

/**
 * Backend client for the shared event state.
 *
 * There are no users, accounts or sessions in BonaFlow: every device reads and
 * writes the same single event dataset, so session persistence and token
 * refreshing are switched off deliberately.
 */

/**
 * The address and key are read from two independent places, because they reach the
 * app by two different routes:
 *
 *  - `process.env.EXPO_PUBLIC_*` is substituted into this file when Metro
 *    transforms it. That substitution is cached, so a bundle transformed before
 *    the credentials existed keeps an empty string until the cache is cleared.
 *  - `extra` in app.config.ts is read when the app config is evaluated, which is
 *    a separate step with its own timing.
 *
 * Whichever one has a value wins, so the app connects in both cases.
 */
function resolve(inlined: string | undefined, fromConfig: unknown): string {
  const candidates = [inlined, typeof fromConfig === 'string' ? fromConfig : undefined];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim() ?? '';
    if (trimmed.length > 0) return trimmed;
  }
  return '';
}

const extra: Record<string, unknown> = Constants.expoConfig?.extra ?? {};

const url = resolve(process.env.EXPO_PUBLIC_BILT_URL, extra.biltUrl);
const anonKey = resolve(process.env.EXPO_PUBLIC_BILT_ANON_KEY, extra.biltAnonKey);

/**
 * The client, or null on a build with no credentials.
 *
 * `createClient` throws when the address is empty, and this module is imported
 * from the store and from every screen, so building it unconditionally would take
 * the whole app down with a stack trace instead of running local-only. Callers
 * check for null and say so in the interface.
 */
export const bilt =
  url.length > 0 && anonKey.length > 0
    ? createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
