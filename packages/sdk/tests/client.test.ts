import { beforeEach, describe, expect, it } from 'bun:test';
import { FilegateClient, FilegateApiError } from '../src/index';

describe('FilegateClient', () => {
  let requests: Array<{ url: string; method: string; auth: string | null }>;

  beforeEach(() => {
    requests = [];
  });

  function mockFetch(responseBody: unknown, status = 200): typeof fetch {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push({
        url: request.url,
        method: request.method,
        auth: request.headers.get('authorization'),
      });

      return new Response(
        status === 204 ? null : JSON.stringify(responseBody),
        status === 204
          ? { status }
          : {
              status,
              headers: { 'content-type': 'application/json' },
            },
      );
    }) as typeof fetch;
  }

  it('uses env configuration and sends bearer token', async () => {
    process.env.FILEGATE_API_URL = 'http://localhost:3100';
    process.env.FILEGATE_TOKEN = 'abc123';

    const client = new FilegateClient({ fetch: mockFetch([]) });
    await client.sessions.list();

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('http://localhost:3100/sessions');
    expect(requests[0]?.auth).toBe('Bearer abc123');
  });

  it('maps API error payloads to FilegateApiError', async () => {
    const client = new FilegateClient({
      url: 'http://localhost:3100',
      token: 'abc123',
      fetch: mockFetch({ error: 'Unauthorized' }, 401),
    });

    await expect(client.sessions.list()).rejects.toBeInstanceOf(FilegateApiError);
  });
});
