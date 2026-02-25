import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'bun';
import { createServer } from '../src/api/server';
import type { FilegateConfig } from '../src/config';

const TOKEN = 'test-secret';

describe('filegate api', () => {
  let tempDir = '';
  let server: Server<unknown>;
  let baseUrl = '';
  let config: FilegateConfig;

  async function api(path: string, init: RequestInit = {}, authenticated = true): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    if (authenticated) {
      headers.set('Authorization', `Bearer ${TOKEN}`);
    }

    return fetch(`${baseUrl}${path}`, { ...init, headers });
  }

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'filegate-api-test-'));
    config = {
      port: 0,
      inboxPath: join(tempDir, 'inbox'),
      apiSecret: TOKEN,
      maxFileSize: 32,
      unzipEnabled: false,
      allowedIps: new Set(),
    };

    server = createServer(config);
    baseUrl = `http://127.0.0.1:${server.port}`;
  });

  afterAll(async () => {
    server.stop(true);
    await rm(tempDir, { recursive: true, force: true });
  });

  it('GET /health is public', async () => {
    const response = await api('/health', {}, false);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('requires auth for protected routes', async () => {
    const response = await api('/sessions', {}, false);
    expect(response.status).toBe(401);
  });

  it('creates, lists, updates, and deletes sessions', async () => {
    const create = await api('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'Biblioteques Q1 2025' }),
    });

    expect(create.status).toBe(201);
    const created = await create.json();
    expect(created.id).toMatch(/^ses_[a-zA-Z0-9]{6}$/);
    expect(created.label).toBe('Biblioteques Q1 2025');
    expect(created.status).toBe('pending');
    expect(created.files).toEqual([]);

    const list = await api('/sessions');
    expect(list.status).toBe(200);
    const sessions = await list.json();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBe(1);

    const sessionId = created.id as string;
    const get = await api(`/sessions/${sessionId}`);
    expect(get.status).toBe(200);

    const patch = await api(`/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'Promo Econòmica', status: 'picked' }),
    });
    expect(patch.status).toBe(200);
    const patched = await patch.json();
    expect(patched.label).toBe('Promo Econòmica');
    expect(patched.status).toBe('picked');

    const del = await api(`/sessions/${sessionId}`, { method: 'DELETE' });
    expect(del.status).toBe(204);

    const getAfterDelete = await api(`/sessions/${sessionId}`);
    expect(getAfterDelete.status).toBe(404);
  });

  it('uploads files and resolves collisions with timestamp suffix', async () => {
    const create = await api('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'upload-test' }),
    });
    const created = await create.json();
    const sessionId = created.id as string;

    const form1 = new FormData();
    form1.append('files', new File(['hello'], 'report.txt', { type: 'text/plain' }));
    const upload1 = await api(`/sessions/${sessionId}/files`, { method: 'POST', body: form1 });
    expect(upload1.status).toBe(201);

    const form2 = new FormData();
    form2.append('files', new File(['world'], 'report.txt', { type: 'text/plain' }));
    const upload2 = await api(`/sessions/${sessionId}/files`, { method: 'POST', body: form2 });
    expect(upload2.status).toBe(201);

    const session = await api(`/sessions/${sessionId}`);
    const payload = await session.json();

    expect(payload.files.length).toBe(2);
    expect(payload.files[0].name).toBe('report.txt');
    expect(payload.files[1].name).toMatch(/^report-\d{8}T\d{6}\.txt$/);

    const filesOnDisk = await readdir(join(config.inboxPath, sessionId));
    expect(filesOnDisk.some((name) => name === 'session.json')).toBe(true);
    expect(filesOnDisk.filter((name) => name.endsWith('.txt')).length).toBe(2);
  });

  it('enforces MAX_FILE_SIZE', async () => {
    const create = await api('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'size-test' }),
    });
    const created = await create.json();
    const sessionId = created.id as string;

    const overLimit = 'x'.repeat(64);
    const form = new FormData();
    form.append('files', new File([overLimit], 'large.bin', { type: 'application/octet-stream' }));

    const upload = await api(`/sessions/${sessionId}/files`, { method: 'POST', body: form });
    expect(upload.status).toBe(413);
  });

  it('deletes uploaded files from a session', async () => {
    const create = await api('/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'delete-file-test' }),
    });
    const created = await create.json();
    const sessionId = created.id as string;

    const form = new FormData();
    form.append('files', new File(['hello'], 'delete-me.txt', { type: 'text/plain' }));
    const upload = await api(`/sessions/${sessionId}/files`, { method: 'POST', body: form });
    expect(upload.status).toBe(201);

    const remove = await api(`/sessions/${sessionId}/files/delete-me.txt`, { method: 'DELETE' });
    expect(remove.status).toBe(204);

    const diskPath = join(config.inboxPath, sessionId, 'delete-me.txt');
    await expect(stat(diskPath)).rejects.toThrow();
  });
});
