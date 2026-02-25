import type { Server } from 'bun';
import type { FilegateConfig } from '../config';

function extractClientIp(request: Request, server: Server<unknown>): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return server.requestIP(request)?.address ?? null;
}

export function requireAuth(
  request: Request,
  server: Server<unknown>,
  config: FilegateConfig,
): Response | null {
  if (config.allowedIps.size > 0) {
    const clientIp = extractClientIp(request, server);
    if (!clientIp || !config.allowedIps.has(clientIp)) {
      return Response.json({ error: 'IP not allowed' }, { status: 403 });
    }
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || token !== config.apiSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
