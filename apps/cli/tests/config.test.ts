import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, setConfigValue } from '../src/config';

describe('config', () => {
  let tempPath = '';

  afterEach(async () => {
    if (tempPath) {
      await rm(tempPath, { recursive: true, force: true });
      tempPath = '';
    }
  });

  it('loads defaults when config does not exist', async () => {
    tempPath = await mkdtemp(join(tmpdir(), 'filegate-cli-config-'));
    const path = join(tempPath, 'config.json');

    const config = await loadConfig(path, {
      FILEGATE_API_URL: 'https://upload.example.com',
      FILEGATE_TOKEN: 'token123',
    });

    expect(config.api_url).toBe('https://upload.example.com');
    expect(config.token).toBe('token123');
  });

  it('writes updates via setConfigValue', async () => {
    tempPath = await mkdtemp(join(tmpdir(), 'filegate-cli-config-'));
    const path = join(tempPath, 'config.json');

    const config = await setConfigValue('api_url', 'https://upload.example.com', path, {});
    expect(config.api_url).toBe('https://upload.example.com');

    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as { api_url: string };
    expect(parsed.api_url).toBe('https://upload.example.com');
  });
});
