import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import chokidar from 'chokidar';

/**
 * SessionEnd hook integration.
 *
 * Claude Code fires the SessionEnd hook with a JSON payload on stdin
 * ({ session_id, transcript_path, cwd, ... }). The `context-keeper hook-event`
 * command enqueues the transcript path as a file in QUEUE_DIR; the running
 * daemon picks it up immediately — exact and instant, unlike the 5-minute
 * inactivity debounce (which remains as fallback for users without the hook).
 *
 * Queue entries persist across daemon restarts, so sessions that end while
 * the daemon is down are processed at the next startup.
 */

export const QUEUE_DIR = path.join(os.homedir(), '.context-keeper', 'queue');

export interface QueueEntry {
  transcriptPath: string;
  queuedAt: string;
}

/**
 * Parses the hook stdin payload and writes a queue entry.
 * Returns the entry path, or null when the payload has no transcript path.
 */
export function enqueueFromHookPayload(rawPayload: string, queueDir = QUEUE_DIR): string | null {
  let transcriptPath: string | undefined;
  try {
    const payload = JSON.parse(rawPayload) as { transcript_path?: string };
    transcriptPath = payload.transcript_path;
  } catch {
    return null;
  }
  if (!transcriptPath) return null;

  fs.mkdirSync(queueDir, { recursive: true });
  const id = path.basename(transcriptPath).replace(/\.jsonl$/, '');
  const entryPath = path.join(queueDir, `${id}.json`);
  const entry: QueueEntry = { transcriptPath, queuedAt: new Date().toISOString() };
  fs.writeFileSync(entryPath, JSON.stringify(entry) + '\n', 'utf-8');
  return entryPath;
}

/**
 * Watches the queue dir and hands each enqueued transcript to `onTranscript`.
 * Existing entries are drained on startup (ignoreInitial: false) — that's the
 * catch-up path for sessions that ended while the daemon was down.
 */
export function watchQueue(
  onTranscript: (transcriptPath: string) => Promise<void>,
  queueDir = QUEUE_DIR,
): () => void {
  fs.mkdirSync(queueDir, { recursive: true });

  const watcher = chokidar.watch(queueDir, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  });

  watcher.on('add', async (entryPath) => {
    if (!entryPath.endsWith('.json')) return;
    let entry: QueueEntry;
    try {
      entry = JSON.parse(fs.readFileSync(entryPath, 'utf-8')) as QueueEntry;
    } catch (err) {
      console.error(`[hook-queue] Malformed queue entry ${entryPath}:`, err);
      try { fs.unlinkSync(entryPath); } catch { /* already gone */ }
      return;
    }

    // Claim the entry before processing so a crash mid-processing doesn't
    // reprocess forever; the debounce watcher remains as the retry path.
    try { fs.unlinkSync(entryPath); } catch { /* already claimed */ }

    if (!entry.transcriptPath) return;
    console.log(`[hook-queue] Session ended (hook): ${entry.transcriptPath}`);
    try {
      await onTranscript(entry.transcriptPath);
    } catch (err) {
      console.error(`[hook-queue] Error processing ${entry.transcriptPath}:`, err);
    }
  });

  watcher.on('error', (err) => {
    console.error('[hook-queue] Filesystem error:', err);
  });

  return () => {
    watcher.close();
  };
}

const HOOK_COMMAND = 'context-keeper hook-event';

interface ClaudeSettings {
  hooks?: Record<string, Array<{ matcher?: string; hooks?: Array<{ type?: string; command?: string }> }>>;
  [key: string]: unknown;
}

/**
 * Adds the SessionEnd hook to Claude Code settings (non-destructive merge).
 * Returns whether the hook was installed or was already present.
 */
export function installSessionEndHook(
  settingsPath = path.join(os.homedir(), '.claude', 'settings.json'),
): { settingsPath: string; status: 'installed' | 'already-installed' } {
  let settings: ClaudeSettings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as ClaudeSettings;
  }

  settings.hooks ??= {};
  settings.hooks['SessionEnd'] ??= [];

  const alreadyInstalled = settings.hooks['SessionEnd'].some((group) =>
    group.hooks?.some((h) => h.command?.includes('context-keeper hook-event')),
  );
  if (alreadyInstalled) {
    return { settingsPath, status: 'already-installed' };
  }

  settings.hooks['SessionEnd'].push({
    hooks: [{ type: 'command', command: HOOK_COMMAND }],
  });

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  return { settingsPath, status: 'installed' };
}
