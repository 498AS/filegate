import { loadConfig } from './config';
import { createServer } from './api/server';

const config = loadConfig();
if (!config.apiSecret) {
  throw new Error('API_SECRET is required');
}

const server = createServer(config);

console.log(`filegate api listening on http://localhost:${server.port}`);
