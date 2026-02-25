import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import picomatch from 'picomatch';
import { formatBytes } from '../format';
import type { CommandContext } from '../types';

export async function runPick(
  context: CommandContext,
  sessionId: string,
  flags: Record<string, string | boolean>,
): Promise<void> {
  const dest = typeof flags.dest === 'string' ? flags.dest : undefined;
  if (!dest) {
    throw new Error('--dest is required');
  }

  const destination = resolve(dest);
  const dryRun = Boolean(flags['dry-run']);
  const noMark = Boolean(flags['no-mark']);
  const filter = typeof flags.filter === 'string' ? picomatch(flags.filter) : null;

  const session = await context.client.sessions.get(sessionId);
  const selected = filter ? session.files.filter((file) => filter(file.name)) : session.files;

  if (selected.length === 0) {
    context.stdout('No files matched the pick criteria.');
    return;
  }

  if (!dryRun) {
    await mkdir(destination, { recursive: true });
  }

  let totalBytes = 0;
  for (const file of selected) {
    totalBytes += file.size;
    const targetPath = join(destination, file.name);

    if (dryRun) {
      context.stdout(`[dry-run] ${file.name} -> ${targetPath}`);
      continue;
    }

    const data = await context.client.files.download(sessionId, file.name);
    await Bun.write(targetPath, data);
    context.stdout(`Copied ${file.name} -> ${targetPath}`);
  }

  if (!dryRun && !noMark) {
    await context.client.sessions.pick(sessionId);
  }

  context.stdout('');
  context.stdout(
    `Picked ${selected.length} file(s), ${formatBytes(totalBytes)} total${dryRun ? ' (dry-run)' : ''}${
      noMark ? ' (not marked)' : ''
    }`,
  );
}
