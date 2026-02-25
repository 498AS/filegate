#!/usr/bin/env bun
import { FilegateApiError, FilegateClient } from '@filegate/sdk';
import { parseArgs } from './args';
import { loadConfig, setConfigValue } from './config';
import { runList } from './commands/list';
import { runShow } from './commands/show';
import { runLabel } from './commands/label';
import { runArchive } from './commands/archive';
import { runPick } from './commands/pick';
import { printHelp } from './help';
import { confirmPrompt } from './io';
import type { CommandContext } from './types';

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  const command = parsed.command;

  if (!command || command === '--help' || command === 'help') {
    console.log(printHelp());
    return 0;
  }

  if (command === 'config') {
    const [action, key, ...valueParts] = parsed.positionals;
    if (action !== 'set' || (key !== 'api_url' && key !== 'token')) {
      console.error('Usage: filegate config set <api_url|token> <value>');
      return 1;
    }

    const value = valueParts.join(' ').trim();
    if (!value) {
      console.error('Value is required.');
      return 1;
    }

    await setConfigValue(key, value);
    console.log(`Config updated: ${key}`);
    return 0;
  }

  const config = await loadConfig();
  const client = new FilegateClient({
    url: config.api_url,
    token: config.token,
  });

  const context: CommandContext = {
    client,
    stdout: (text) => console.log(text),
    stderr: (text) => console.error(text),
    confirm: confirmPrompt,
  };

  switch (command) {
    case 'list':
      await runList(context, parsed.flags);
      return 0;

    case 'show': {
      const [sessionId] = parsed.positionals;
      if (!sessionId) {
        context.stderr('Usage: filegate show <session-id>');
        return 1;
      }
      await runShow(context, sessionId);
      return 0;
    }

    case 'label': {
      const [sessionId, ...labelParts] = parsed.positionals;
      const label = labelParts.join(' ').trim();
      if (!sessionId || !label) {
        context.stderr('Usage: filegate label <session-id> <text>');
        return 1;
      }
      await runLabel(context, sessionId, label);
      return 0;
    }

    case 'archive': {
      const [sessionId] = parsed.positionals;
      if (!sessionId) {
        context.stderr('Usage: filegate archive <session-id> [--yes]');
        return 1;
      }
      await runArchive(context, sessionId, parsed.flags);
      return 0;
    }

    case 'pick': {
      const [sessionId] = parsed.positionals;
      if (!sessionId) {
        context.stderr('Usage: filegate pick <session-id> --dest <path> [--filter <glob>] [--no-mark] [--dry-run]');
        return 1;
      }
      await runPick(context, sessionId, parsed.flags);
      return 0;
    }

    default:
      context.stderr(`Unknown command: ${command}`);
      context.stdout(printHelp());
      return 1;
  }
}

main(Bun.argv.slice(2))
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    if (error instanceof FilegateApiError) {
      console.error(`API error (${error.status}): ${error.message}`);
      process.exit(1);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
