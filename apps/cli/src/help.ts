const HELP = `
filegate - Filegate CLI

Usage:
  filegate <command> [args] [--flags]

Commands:
  list [--status pending|picked|archived] [--json]
  show <session-id>
  pick <session-id> --dest <path> [--filter <glob>] [--no-mark] [--dry-run]
  label <session-id> <text>
  archive <session-id> [--yes]
  config set <api_url|token> <value>
`;

export function printHelp(): string {
  return HELP.trim();
}
