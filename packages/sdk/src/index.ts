import createClient, { type ClientOptions } from 'openapi-fetch';
import type { components, paths } from './generated/types';

export type Session = components['schemas']['Session'];
export type FileEntry = components['schemas']['FileEntry'];

export type FilegateClientOptions = {
  url?: string;
  token?: string;
  fetch?: ClientOptions['fetch'];
};

export class FilegateApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function resolveConfig(options: FilegateClientOptions): { url: string; token: string } {
  const url = options.url ?? process.env.FILEGATE_API_URL ?? 'http://localhost:3100';
  const token = options.token ?? process.env.FILEGATE_TOKEN ?? '';

  if (!token) {
    throw new Error('Filegate token is required. Set FILEGATE_TOKEN or pass token option.');
  }

  return { url, token };
}

function errorFromUnknown(status: number, error: unknown): FilegateApiError {
  if (typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'string') {
    return new FilegateApiError(status, error.error, error);
  }

  return new FilegateApiError(status, `Request failed with status ${status}`, error);
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export class FilegateClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  private readonly client: ReturnType<typeof createClient<paths>>;

  constructor(options: FilegateClientOptions = {}) {
    const { url, token } = resolveConfig(options);
    this.baseUrl = url.replace(/\/$/, '');
    this.token = token;
    const requestFetch: ClientOptions['fetch'] = options.fetch ?? ((request) => fetch(request));
    this.fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      return requestFetch(request);
    };

    this.client = createClient<paths>({
      baseUrl: this.baseUrl,
      fetch: requestFetch,
    });
  }

  private authHeaders(init: HeadersInit = {}): Headers {
    const headers = new Headers(init);
    headers.set('authorization', `Bearer ${this.token}`);
    return headers;
  }

  private async unwrap<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
    const { data, error, response } = await request;
    if (!response.ok) {
      throw errorFromUnknown(response.status, error);
    }

    return data as T;
  }

  readonly health = async (): Promise<{ ok: boolean }> => {
    const response = await this.fetchImpl(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new FilegateApiError(response.status, 'Health check failed', await readJson<unknown>(response));
    }

    return readJson<{ ok: boolean }>(response);
  };

  readonly sessions = {
    create: async (input?: { label?: string }): Promise<Session> => {
      return this.unwrap(
        this.client.POST('/sessions', {
          body: input,
          headers: this.authHeaders({ 'content-type': 'application/json' }),
        }),
      );
    },

    list: async (): Promise<Session[]> => {
      return this.unwrap(
        this.client.GET('/sessions', {
          headers: this.authHeaders(),
        }),
      );
    },

    get: async (id: string): Promise<Session> => {
      return this.unwrap(
        this.client.GET('/sessions/{id}', {
          params: { path: { id } },
          headers: this.authHeaders(),
        }),
      );
    },

    update: async (id: string, patch: { label?: string | null; status?: Session['status'] }): Promise<Session> => {
      return this.unwrap(
        this.client.PATCH('/sessions/{id}', {
          params: { path: { id } },
          body: patch,
          headers: this.authHeaders({ 'content-type': 'application/json' }),
        }),
      );
    },

    pick: async (id: string): Promise<Session> => {
      return this.sessions.update(id, { status: 'picked' });
    },

    remove: async (id: string): Promise<void> => {
      await this.unwrap(
        this.client.DELETE('/sessions/{id}', {
          params: { path: { id } },
          headers: this.authHeaders(),
        }),
      );
    },
  };

  readonly files = {
    upload: async (sessionId: string, files: File[] | FileList): Promise<FileEntry[]> => {
      const form = new FormData();
      for (const file of Array.from(files)) {
        form.append('files', file);
      }

      const response = await this.fetchImpl(
        `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/files`,
        {
          method: 'POST',
          headers: this.authHeaders(),
          body: form,
        },
      );

      if (!response.ok) {
        throw errorFromUnknown(response.status, await readJson<unknown>(response));
      }

      const payload = await readJson<{ uploaded: FileEntry[] }>(response);
      return payload.uploaded;
    },

    download: async (sessionId: string, fileName: string): Promise<ArrayBuffer> => {
      const response = await this.fetchImpl(
        `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: this.authHeaders(),
        },
      );

      if (!response.ok) {
        throw errorFromUnknown(response.status, await readJson<unknown>(response));
      }

      return response.arrayBuffer();
    },

    remove: async (sessionId: string, fileName: string): Promise<void> => {
      await this.unwrap(
        this.client.DELETE('/sessions/{id}/files/{name}', {
          params: { path: { id: sessionId, name: fileName } },
          headers: this.authHeaders(),
        }),
      );
    },
  };
}
