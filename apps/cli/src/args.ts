import type { ParsedArgs } from './types';

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token) {
      continue;
    }

    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
      continue;
    }

    positionals.push(token);
  }

  return { command, positionals, flags };
}
