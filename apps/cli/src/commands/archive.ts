import type { CommandContext } from '../types';

export async function runArchive(
  context: CommandContext,
  sessionId: string,
  flags: Record<string, string | boolean>,
): Promise<void> {
  const session = await context.client.sessions.get(sessionId);
  const skipConfirm = Boolean(flags.yes || flags.force);

  if (session.status === 'pending' && !skipConfirm) {
    const accepted = await context.confirm(
      `Session ${session.id} is pending with ${session.files.length} files. Archive anyway?`,
    );
    if (!accepted) {
      context.stdout('Archive canceled.');
      return;
    }
  }

  const updated = await context.client.sessions.update(sessionId, { status: 'archived' });
  context.stdout(`Archived ${updated.id}`);
}
