import { resolve } from 'node:path';

export type FilegateConfig = {
  port: number;
  inboxPath: string;
  apiSecret: string;
  maxFileSize: number;
  unzipEnabled: boolean;
  allowedIps: Set<string>;
  trustedProxyIps: Set<string>;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): FilegateConfig {
  return {
    port: Number(env.PORT ?? 3100),
    inboxPath: resolve(env.INBOX_PATH ?? 'inbox'),
    apiSecret: env.API_SECRET ?? '',
    maxFileSize: Number(env.MAX_FILE_SIZE ?? 209_715_200),
    unzipEnabled: String(env.UNZIP_ENABLED ?? 'false').toLowerCase() === 'true',
    allowedIps: new Set(
      String(env.ALLOWED_IPS ?? '')
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean),
    ),
    trustedProxyIps: new Set(
      String(env.TRUSTED_PROXY_IPS ?? '')
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean),
    ),
  };
}
