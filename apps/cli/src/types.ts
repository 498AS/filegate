import type { FilegateClient } from '@filegate/sdk';

export type CommandContext = {
  client: FilegateClient;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  confirm: (question: string) => Promise<boolean>;
};

export type ParsedArgs = {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | boolean>;
};
