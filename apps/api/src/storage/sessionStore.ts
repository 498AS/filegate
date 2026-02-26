import { randomBytes } from 'node:crypto';
import { basename, extname, join } from 'node:path';
import { mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import type { FileEntry, Session, SessionStatus } from './types';

const SESSION_PREFIX = 'ses_';
const SESSION_ID_LENGTH = 6;
const SESSION_FILE_NAME = 'session.json';

const MIME_BY_EXT: Record<string, string> = {
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
};

const sessionLocks = new Map<string, Promise<void>>();

export class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sessionDir(inboxPath: string, sessionId: string): string {
  return join(inboxPath, sessionId);
}

function sessionFilePath(inboxPath: string, sessionId: string): string {
  return join(sessionDir(inboxPath, sessionId), SESSION_FILE_NAME);
}

async function ensureInbox(inboxPath: string): Promise<void> {
  await mkdir(inboxPath, { recursive: true });
}

function randomSessionSuffix(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(SESSION_ID_LENGTH);
  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length] ?? 'a')
    .join('');
}

async function sessionExists(inboxPath: string, sessionId: string): Promise<boolean> {
  try {
    const info = await stat(sessionDir(inboxPath, sessionId));
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function generateSessionId(inboxPath: string): Promise<string> {
  for (let attempts = 0; attempts < 32; attempts += 1) {
    const id = `${SESSION_PREFIX}${randomSessionSuffix()}`;
    if ((await sessionExists(inboxPath, id)) === false) {
      return id;
    }
  }

  throw new HttpError(500, 'Could not generate unique session id');
}

async function writeSession(inboxPath: string, session: Session): Promise<void> {
  const destination = sessionFilePath(inboxPath, session.id);
  const tempPath = `${destination}.tmp`;
  await writeFile(tempPath, JSON.stringify(session, null, 2));
  await rename(tempPath, destination);
}

function parseSession(raw: string): Session {
  return JSON.parse(raw) as Session;
}

export async function createSession(inboxPath: string, label?: string): Promise<Session> {
  await ensureInbox(inboxPath);
  const id = await generateSessionId(inboxPath);
  const dir = sessionDir(inboxPath, id);
  await mkdir(dir, { recursive: false });

  const session: Session = {
    id,
    created: new Date().toISOString(),
    label: label?.trim() ? label.trim() : null,
    status: 'pending',
    files: [],
  };

  await writeSession(inboxPath, session);
  return session;
}

export async function listSessions(inboxPath: string): Promise<Session[]> {
  await ensureInbox(inboxPath);
  const entries = await readdir(inboxPath, { withFileTypes: true });

  const sessions: Session[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SESSION_PREFIX)) {
      continue;
    }

    const file = sessionFilePath(inboxPath, entry.name);
    try {
      const raw = await readFile(file, 'utf8');
      sessions.push(parseSession(raw));
    } catch {
      continue;
    }
  }

  return sessions.sort((a, b) => b.created.localeCompare(a.created));
}

export async function getSession(inboxPath: string, sessionId: string): Promise<Session | null> {
  try {
    const raw = await readFile(sessionFilePath(inboxPath, sessionId), 'utf8');
    return parseSession(raw);
  } catch {
    return null;
  }
}

export async function updateSession(
  inboxPath: string,
  sessionId: string,
  patch: { label?: string | null; status?: SessionStatus },
): Promise<Session | null> {
  const existing = await getSession(inboxPath, sessionId);
  if (!existing) {
    return null;
  }

  const updated: Session = {
    ...existing,
    label: patch.label === undefined ? existing.label : patch.label,
    status: patch.status ?? existing.status,
  };

  await writeSession(inboxPath, updated);
  return updated;
}

export async function deleteSession(inboxPath: string, sessionId: string): Promise<boolean> {
  try {
    await rm(sessionDir(inboxPath, sessionId), { recursive: true, force: false });
    return true;
  } catch {
    return false;
  }
}

function safePath(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const normalized = raw
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg !== '..' && seg !== '.' && seg.length > 0)
    .join('/');
  return normalized || undefined;
}

function safeName(fileName: string): string {
  const base = basename(fileName).replace(/\s+/g, ' ').trim();
  const normalized = base.replace(/[^a-zA-Z0-9._ -]/g, '_');
  return normalized || 'file.bin';
}

function timestampSuffix(date: Date): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveCollision(folderPath: string, fileName: string): Promise<string> {
  const clean = safeName(fileName);
  const fullPath = join(folderPath, clean);
  if ((await pathExists(fullPath)) === false) {
    return clean;
  }

  const ext = extname(clean);
  const stem = clean.slice(0, clean.length - ext.length);
  const stamp = timestampSuffix(new Date());
  let candidate = `${stem}-${stamp}${ext}`;
  let index = 1;

  while (await pathExists(join(folderPath, candidate))) {
    candidate = `${stem}-${stamp}-${index}${ext}`;
    index += 1;
  }

  return candidate;
}

function mimeFromName(fileName: string, fallback = 'application/octet-stream'): string {
  return MIME_BY_EXT[extname(fileName).toLowerCase()] ?? fallback;
}

const ZIP_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed']);

function hasZipSignature(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4) {
    return false;
  }

  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function shouldUnzip(file: File, bytes: Uint8Array): boolean {
  const mimeMatch = ZIP_MIME_TYPES.has(file.type.toLowerCase());
  const extensionMatch = file.name.toLowerCase().endsWith('.zip');
  return (mimeMatch || extensionMatch) && hasZipSignature(bytes);
}

async function storeOneFile(
  inboxPath: string,
  sessionId: string,
  fileName: string,
  bytes: ArrayBuffer | Uint8Array,
  mime: string,
  path?: string,
): Promise<FileEntry> {
  const folder = sessionDir(inboxPath, sessionId);
  const finalName = await resolveCollision(folder, fileName);
  await Bun.write(join(folder, finalName), bytes);

  const size = bytes instanceof ArrayBuffer ? bytes.byteLength : bytes.byteLength;
  const entry: FileEntry = {
    name: finalName,
    size,
    mime,
    uploaded: new Date().toISOString(),
  };
  if (path) entry.path = path;
  return entry;
}

async function unzipIntoSession(
  inboxPath: string,
  sessionId: string,
  zipBytes: Uint8Array,
  maxFileSize: number,
): Promise<FileEntry[]> {
  const buffer = Buffer.from(zipBytes);
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  const prepared: Array<{ fileName: string; mime: string; data: Buffer }> = [];
  let totalDeclaredSize = 0;
  let totalExtractedSize = 0;

  for (const entry of entries) {
    const declaredSize = Math.max(0, Number(entry.header.size ?? 0));
    if (declaredSize > maxFileSize) {
      throw new HttpError(413, `Extracted file too large: ${entry.entryName}`);
    }

    totalDeclaredSize += declaredSize;
    if (totalDeclaredSize > maxFileSize) {
      throw new HttpError(413, 'Total declared ZIP size exceeds MAX_FILE_SIZE');
    }

    const normalizedEntryPath = entry.entryName.replace(/\\/g, '/');
    const fileName = safeName(basename(normalizedEntryPath));
    const data = entry.getData();
    if (data.byteLength > maxFileSize) {
      throw new HttpError(413, `Extracted file too large: ${fileName}`);
    }

    totalExtractedSize += data.byteLength;
    if (totalExtractedSize > maxFileSize) {
      throw new HttpError(413, 'Total extracted size exceeds MAX_FILE_SIZE');
    }

    prepared.push({ fileName, mime: mimeFromName(fileName), data });
  }

  const uploaded: FileEntry[] = [];
  for (const item of prepared) {
    const uploadedItem = await storeOneFile(
      inboxPath,
      sessionId,
      item.fileName,
      item.data,
      item.mime,
    );
    uploaded.push(uploadedItem);
  }

  return uploaded;
}

async function withSessionLock<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
  const previous = sessionLocks.get(sessionId) ?? Promise.resolve();
  let releaseCurrent: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const slot = previous.then(() => current);
  sessionLocks.set(sessionId, slot);

  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrent();
    if (sessionLocks.get(sessionId) === slot) {
      sessionLocks.delete(sessionId);
    }
  }
}

export async function addFilesToSession(
  inboxPath: string,
  sessionId: string,
  files: File[],
  maxFileSize: number,
  unzipEnabled: boolean,
  paths?: string[],
): Promise<FileEntry[]> {
  return withSessionLock(sessionId, async () => {
    const session = await getSession(inboxPath, sessionId);
    if (!session) {
      throw new HttpError(404, 'Session not found');
    }

    if (files.length === 0) {
      throw new HttpError(400, 'No files provided');
    }

    for (const file of files) {
      if (file.size > maxFileSize) {
        throw new HttpError(413, `File too large: ${file.name}`);
      }
    }

    const uploaded: FileEntry[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const filePath = safePath(paths?.[i]);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const isZip = shouldUnzip(file, bytes);
      if (unzipEnabled && isZip) {
        const unzipped = await unzipIntoSession(inboxPath, sessionId, bytes, maxFileSize);
        uploaded.push(...unzipped);
        continue;
      }

      const item = await storeOneFile(
        inboxPath,
        sessionId,
        file.name,
        bytes,
        file.type || mimeFromName(file.name),
        filePath,
      );
      uploaded.push(item);
    }

    const freshSession = await getSession(inboxPath, sessionId);
    if (!freshSession) {
      throw new HttpError(404, 'Session not found');
    }

    const updated: Session = {
      ...freshSession,
      files: [...freshSession.files, ...uploaded],
    };

    await writeSession(inboxPath, updated);
    return uploaded;
  });
}

export async function deleteSessionFile(
  inboxPath: string,
  sessionId: string,
  fileName: string,
): Promise<boolean> {
  const session = await getSession(inboxPath, sessionId);
  if (!session) {
    return false;
  }

  const clean = safeName(fileName);
  const targetPath = join(sessionDir(inboxPath, sessionId), clean);

  try {
    await unlink(targetPath);
  } catch {
    return false;
  }

  const updated: Session = {
    ...session,
    files: session.files.filter((entry) => entry.name !== clean),
  };
  await writeSession(inboxPath, updated);
  return true;
}

export async function readSessionFile(
  inboxPath: string,
  sessionId: string,
  fileName: string,
): Promise<Bun.BunFile | null> {
  const session = await getSession(inboxPath, sessionId);
  if (!session) {
    return null;
  }

  const clean = safeName(fileName);
  if (!session.files.some((entry) => entry.name === clean)) {
    return null;
  }

  const path = join(sessionDir(inboxPath, sessionId), clean);
  if ((await pathExists(path)) === false) {
    return null;
  }

  return Bun.file(path);
}
