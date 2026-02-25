import { describe, expect, it } from 'bun:test';
import { parseArgs } from '../src/args';

describe('parseArgs', () => {
  it('parses positionals and boolean flags', () => {
    const parsed = parseArgs(['pick', 'ses_abc123', '--dry-run', '--no-mark']);

    expect(parsed.command).toBe('pick');
    expect(parsed.positionals).toEqual(['ses_abc123']);
    expect(parsed.flags['dry-run']).toBe(true);
    expect(parsed.flags['no-mark']).toBe(true);
  });

  it('parses keyed flag values', () => {
    const parsed = parseArgs(['list', '--status', 'pending', '--json']);

    expect(parsed.command).toBe('list');
    expect(parsed.flags.status).toBe('pending');
    expect(parsed.flags.json).toBe(true);
  });
});
