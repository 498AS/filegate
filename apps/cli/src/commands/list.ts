import type { Session } from '@filegate/sdk';
import { formatDate, pad } from '../format';
import type { CommandContext } from '../types';

export async function runList(context: CommandContext, flags: Record<string, string | boolean>): Promise<void> {
  const statusFilter = typeof flags.status === 'string' ? flags.status : undefined;
  const asJson = Boolean(flags.json);

  const sessions = await context.client.sessions.list();
  const filtered = statusFilter ? sessions.filter((session) => session.status === statusFilter) : sessions;

  if (asJson) {
    context.stdout(JSON.stringify(filtered, null, 2));
    return;
  }

  if (filtered.length === 0) {
    context.stdout('No sessions found.');
    return;
  }

  const header = [
    pad('ID', 14),
    pad('STATUS', 10),
    pad('DATE', 12),
    pad('FILES', 8),
    'LABEL',
  ].join(' ');

  context.stdout(header);
  for (const session of filtered) {
    context.stdout(formatSessionRow(session));
  }
}

function formatSessionRow(session: Session): string {
  const label = session.label ?? '—';
  return [
    pad(session.id, 14),
    pad(session.status, 10),
    pad(formatDate(session.created), 12),
    pad(String(session.files.length), 8),
    label,
  ].join(' ');
}
