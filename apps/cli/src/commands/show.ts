import { formatBytes } from '../format';
import type { CommandContext } from '../types';

export async function runShow(context: CommandContext, sessionId: string): Promise<void> {
  const session = await context.client.sessions.get(sessionId);

  context.stdout(`Session: ${session.id}`);
  context.stdout(`Status: ${session.status}`);
  context.stdout(`Created: ${session.created}`);
  context.stdout(`Label: ${session.label ?? '—'}`);
  context.stdout(`Files: ${session.files.length}`);

  if (session.files.length === 0) {
    context.stdout('No files in this session.');
    return;
  }

  context.stdout('');
  context.stdout('FILES');
  for (const file of session.files) {
    context.stdout(`- ${file.name} (${formatBytes(file.size)}) ${file.mime}`);
  }
}
