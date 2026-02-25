import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export type FilegateCliConfig = {
  api_url: string;
  token: string;
};

const DEFAULT_API_URL = 'http://localhost:3100';

export function resolveConfigPath(home = homedir()): string {
  return join(home, '.filegate', 'config.json');
}

export function defaultConfig(env: NodeJS.ProcessEnv = process.env): FilegateCliConfig {
  return {
    api_url: env.FILEGATE_API_URL ?? DEFAULT_API_URL,
    token: env.FILEGATE_TOKEN ?? '',
  };
}

export async function loadConfig(path = resolveConfigPath(), env: NodeJS.ProcessEnv = process.env): Promise<FilegateCliConfig> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FilegateCliConfig>;
    return {
      api_url: parsed.api_url ?? env.FILEGATE_API_URL ?? DEFAULT_API_URL,
      token: parsed.token ?? env.FILEGATE_TOKEN ?? '',
    };
  } catch {
    return defaultConfig(env);
  }
}

export async function saveConfig(config: FilegateCliConfig, path = resolveConfigPath()): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2));
}

export async function setConfigValue(
  key: 'api_url' | 'token',
  value: string,
  path = resolveConfigPath(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<FilegateCliConfig> {
  const config = await loadConfig(path, env);
  config[key] = value;
  await saveConfig(config, path);
  return config;
}
