import type { Server } from 'bun';
import type { FilegateConfig } from '../config';

function forwardedIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) {
    return null;
  }

  const first = forwarded.split(',')[0]?.trim();
  return first || null;
}

function extractClientIp(request: Request, server: Server<unknown>, config: FilegateConfig): string | null {
  const directPeerIp = server.requestIP(request)?.address ?? null;
  if (!directPeerIp) {
    return null;
  }

  const headerIp = forwardedIp(request);
  if (headerIp && config.trustedProxyIps.has(directPeerIp)) {
    return headerIp;
  }

  return directPeerIp;
}

export function requireAuth(
  request: Request,
  server: Server<unknown>,
  config: FilegateConfig,
): Response | null {
  if (config.allowedIps.size > 0) {
    const clientIp = extractClientIp(request, server, config);
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
