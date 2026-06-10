import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Web dashboard sync with a disk-backed queue.
 *
 * The old behaviour (1 retry after 2s, then give up) silently lost decisions
 * whenever the API was unreachable. Failed payloads now persist to
 * ~/.context-keeper/sync-queue/ and are replayed before the next sync and at
 * daemon startup.
 */

export const SYNC_QUEUE_DIR = path.join(os.homedir(), '.context-keeper', 'sync-queue');
const MAX_QUEUE_FILES = 200;
const RETRY_DELAY_MS = 2000;

export interface SyncPayload {
  projectPath: string;
  decisions: Array<{ text: string; createdAt: string }>;
}

async function postPayload(payload: SyncPayload): Promise<void> {
  const apiUrl = process.env.CONTEXT_KEEPER_API_URL;
  if (!apiUrl) throw new Error('CONTEXT_KEEPER_API_URL not set');

  const token = process.env.CONTEXT_KEEPER_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${apiUrl}/api/decisions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { saved: number; skipped: number };
  console.log(`[sync] Web sync: saved=${json.saved}, skipped=${json.skipped}`);
}

async function postWithRetry(payload: SyncPayload): Promise<void> {
  try {
    await postPayload(payload);
  } catch {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    await postPayload(payload);
  }
}

export function persistPayload(payload: SyncPayload, queueDir = SYNC_QUEUE_DIR): string {
  fs.mkdirSync(queueDir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filePath = path.join(queueDir, name);
  fs.writeFileSync(filePath, JSON.stringify(payload) + '\n', 'utf-8');

  // bound queue growth: drop the oldest entries beyond the cap
  const files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json')).sort();
  for (const stale of files.slice(0, Math.max(0, files.length - MAX_QUEUE_FILES))) {
    try { fs.unlinkSync(path.join(queueDir, stale)); } catch { /* already gone */ }
  }

  return filePath;
}

/**
 * Replays queued payloads in FIFO order. Stops at the first failure —
 * the API is still down, remaining entries wait for the next replay.
 */
export async function replayPendingSync(queueDir = SYNC_QUEUE_DIR): Promise<void> {
  if (!process.env.CONTEXT_KEEPER_API_URL) return;

  let files: string[];
  try {
    files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return; // no queue dir yet
  }

  for (const file of files) {
    const filePath = path.join(queueDir, file);
    let payload: SyncPayload;
    try {
      payload = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SyncPayload;
    } catch {
      try { fs.unlinkSync(filePath); } catch { /* already gone */ }
      continue;
    }

    try {
      await postPayload(payload);
      fs.unlinkSync(filePath);
      console.log(`[sync] Replayed queued payload: ${file}`);
    } catch {
      return;
    }
  }
}

/**
 * Syncs decisions to the web dashboard. Never throws — failures are
 * persisted to the disk queue for later replay.
 */
export async function syncDecisionsToWeb(
  projectPath: string,
  decisions: string[],
  queueDir = SYNC_QUEUE_DIR,
): Promise<void> {
  if (!process.env.CONTEXT_KEEPER_API_URL) return; // offline mode — skip silently
  if (decisions.length === 0) return;

  const payload: SyncPayload = {
    projectPath,
    decisions: decisions.map((text) => ({ text, createdAt: new Date().toISOString() })),
  };

  // drain the backlog first so the dashboard receives decisions in order
  await replayPendingSync(queueDir);

  try {
    await postWithRetry(payload);
  } catch (err) {
    console.warn('[sync] Web sync failed, queued for replay:', err);
    persistPayload(payload, queueDir);
  }
}
