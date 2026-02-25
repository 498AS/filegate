import type { Server } from 'bun';
import type { FilegateConfig } from '../config';
import {
  HttpError,
  addFilesToSession,
  createSession,
  deleteSession,
  deleteSessionFile,
  getSession,
  listSessions,
  readSessionFile,
  updateSession,
} from '../storage/sessionStore';
import type { SessionStatus } from '../storage/types';
import { requireAuth } from '../middleware/auth';

const VALID_STATUS = new Set<SessionStatus>(['pending', 'picked', 'archived']);

type JsonRecord = Record<string, unknown>;

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

async function readJsonBody(request: Request): Promise<JsonRecord> {
  try {
    return (await request.json()) as JsonRecord;
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

function sessionIdFrom(pathname: string): string | null {
  const match = pathname.match(/^\/sessions\/([^/]+)$/);
  return match?.[1] ?? null;
}

function sessionIdForFiles(pathname: string): string | null {
  const match = pathname.match(/^\/sessions\/([^/]+)\/files$/);
  return match?.[1] ?? null;
}

function filePathParams(pathname: string): { sessionId: string; fileName: string } | null {
  const match = pathname.match(/^\/sessions\/([^/]+)\/files\/([^/]+)$/);
  if (!match || !match[1] || !match[2]) {
    return null;
  }

  return {
    sessionId: match[1],
    fileName: decodeURIComponent(match[2]),
  };
}

async function handleRequest(
  request: Request,
  server: Server<unknown>,
  config: FilegateConfig,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/health' && request.method === 'GET') {
    return Response.json({ ok: true });
  }

  const auth = requireAuth(request, server, config);
  if (auth) {
    return auth;
  }

  if (pathname === '/sessions' && request.method === 'POST') {
    const body = await readJsonBody(request);
    const label = typeof body.label === 'string' ? body.label : undefined;
    const session = await createSession(config.inboxPath, label);
    return Response.json(session, { status: 201 });
  }

  if (pathname === '/sessions' && request.method === 'GET') {
    const sessions = await listSessions(config.inboxPath);
    return Response.json(sessions);
  }

  const sessionId = sessionIdFrom(pathname);
  if (sessionId && request.method === 'GET') {
    const session = await getSession(config.inboxPath, sessionId);
    return session ? Response.json(session) : jsonError(404, 'Session not found');
  }

  if (sessionId && request.method === 'PATCH') {
    const body = await readJsonBody(request);

    const patch: { label?: string | null; status?: SessionStatus } = {};
    if (body.label !== undefined) {
      if (typeof body.label !== 'string' && body.label !== null) {
        throw new HttpError(400, 'label must be string or null');
      }
      patch.label = body.label;
    }

    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !VALID_STATUS.has(body.status as SessionStatus)) {
        throw new HttpError(400, 'Invalid status');
      }
      patch.status = body.status as SessionStatus;
    }

    const updated = await updateSession(config.inboxPath, sessionId, patch);
    return updated ? Response.json(updated) : jsonError(404, 'Session not found');
  }

  if (sessionId && request.method === 'DELETE') {
    const ok = await deleteSession(config.inboxPath, sessionId);
    return ok ? new Response(null, { status: 204 }) : jsonError(404, 'Session not found');
  }

  const filesSessionId = sessionIdForFiles(pathname);
  if (filesSessionId && request.method === 'POST') {
    const formData = await request.formData();
    const files = formData.getAll('files').filter((value): value is File => value instanceof File);
    const uploaded = await addFilesToSession(
      config.inboxPath,
      filesSessionId,
      files,
      config.maxFileSize,
      config.unzipEnabled,
    );

    return Response.json({ uploaded }, { status: 201 });
  }

  const fileParams = filePathParams(pathname);
  if (fileParams && request.method === 'DELETE') {
    const removed = await deleteSessionFile(config.inboxPath, fileParams.sessionId, fileParams.fileName);
    return removed ? new Response(null, { status: 204 }) : jsonError(404, 'File or session not found');
  }

  if (fileParams && request.method === 'GET') {
    const file = await readSessionFile(config.inboxPath, fileParams.sessionId, fileParams.fileName);
    if (!file) {
      return jsonError(404, 'File or session not found');
    }

    return new Response(file, {
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(fileParams.fileName)}"`,
      },
    });
  }

  return jsonError(404, 'Route not found');
}

export function createServer(config: FilegateConfig): Server<unknown> {
  return Bun.serve({
    port: config.port,
    async fetch(request, server) {
      try {
        return await handleRequest(request, server, config);
      } catch (error) {
        if (error instanceof HttpError) {
          return jsonError(error.status, error.message);
        }

        return jsonError(500, 'Internal server error');
      }
    },
  });
}
