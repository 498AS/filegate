import type { CommandContext } from '../types';

export async function runLabel(context: CommandContext, sessionId: string, label: string): Promise<void> {
  const updated = await context.client.sessions.update(sessionId, { label });
  context.stdout(`Updated label for ${updated.id}: ${updated.label ?? '—'}`);
}
