import { describe, expect, it } from 'bun:test';
import type { Server } from 'bun';
import { requireAuth } from '../src/middleware/auth';
import type { FilegateConfig } from '../src/config';

const BASE_CONFIG: FilegateConfig = {
  port: 3100,
  inboxPath: '/tmp/filegate-test',
  apiSecret: 'test-secret',
  maxFileSize: 1024,
  unzipEnabled: false,
  allowedIps: new Set(),
  trustedProxyIps: new Set(),
};

function mockServer(ip: string | null): Server<unknown> {
  return {
    requestIP: () => (ip ? { address: ip, family: 'IPv4', port: 443 } : null),
  } as unknown as Server<unknown>;
}

describe('requireAuth', () => {
  it('rejects spoofed x-forwarded-for from untrusted peers', async () => {
    const config: FilegateConfig = {
      ...BASE_CONFIG,
      allowedIps: new Set(['203.0.113.10']),
      trustedProxyIps: new Set(),
    };

    const request = new Request('http://localhost/sessions', {
      headers: {
        authorization: 'Bearer test-secret',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    const response = requireAuth(request, mockServer('198.51.100.22'), config);
    expect(response?.status).toBe(403);
  });

  it('accepts forwarded IP only when request comes from a trusted proxy', async () => {
    const config: FilegateConfig = {
      ...BASE_CONFIG,
      allowedIps: new Set(['203.0.113.10']),
      trustedProxyIps: new Set(['198.51.100.22']),
    };

    const request = new Request('http://localhost/sessions', {
      headers: {
        authorization: 'Bearer test-secret',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    const response = requireAuth(request, mockServer('198.51.100.22'), config);
    expect(response).toBeNull();
  });

  it('returns 401 on invalid bearer token', async () => {
    const request = new Request('http://localhost/sessions', {
      headers: { authorization: 'Bearer invalid' },
    });

    const response = requireAuth(request, mockServer('127.0.0.1'), BASE_CONFIG);
    expect(response?.status).toBe(401);
  });
});
