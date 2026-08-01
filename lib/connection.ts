import { formatAge } from '@/lib/clock';
import { formatClock } from '@/lib/stations';
import type { ConnectionStatus } from '@/lib/store';

/**
 * One honest line about the backend, for the operations screens.
 *
 * Three facts are kept apart because they fail apart. When the server last
 * ANSWERED is a property of the connection; when the data last CHANGED is a
 * property of the event — a working server with a quiet room does not move it,
 * which is why a frozen "synced 12:52" line used to read as a dead connection.
 * And a call that could not be sent is not the same as a call that was refused.
 */
export function connectionLine(
  connection: ConnectionStatus,
  /** Event-clock time of the last hydrate, i.e. when the shared data last changed. */
  dataChangedAt: string | null,
): string {
  const pending =
    connection.pending === 0
      ? ''
      : ` · ${connection.pending} ${connection.pending === 1 ? 'change' : 'changes'} waiting to be sent`;

  if (connection.state === 'unconfigured') {
    return `no event server in this build · showing the state held on this device${pending}`;
  }

  if (connection.state === 'connecting') {
    return `contacting the event server…${pending}`;
  }

  if (connection.state === 'live') {
    const changed =
      dataChangedAt === null
        ? 'nothing new yet'
        : `data last changed ${formatClock(dataChangedAt)}`;
    return `live · answered ${formatClock(connection.lastContactAt ?? '')} · ${changed} · rechecks every 3 s${pending}`;
  }

  const reason = connection.lastError ?? 'no answer from the event server';
  const since =
    connection.lastContactAt === null
      ? 'it has not answered once since this app opened'
      : `last answered ${formatClock(connection.lastContactAt)}, ${formatAge(connection.lastContactAt)} ago`;

  return `${reason} · ${since} · showing the state held on this device${pending}`;
}
