import chokidar from 'chokidar';
import * as os from 'os';
import * as path from 'path';

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export type SessionEndedCallback = (filePath: string) => Promise<void>;

/**
 * Watches ~/.claude/projects/**\/*.jsonl for session end events.
 * A session is considered ended when a file stops being modified for 5 minutes.
 */
export function startWatcher(onSessionEnded: SessionEndedCallback): () => void {
  const watchDir = path.join(os.homedir(), '.claude', 'projects');
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const watcher = chokidar.watch(`${watchDir}/**/*.jsonl`, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
  });

  function scheduleSessionEnd(filePath: string) {
    const existing = timers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      timers.delete(filePath);
      try {
        await onSessionEnded(filePath);
      } catch (err) {
        console.error(`[watcher] Error processing session for ${filePath}:`, err);
      }
    }, DEBOUNCE_MS);

    timers.set(filePath, timer);
  }

  watcher.on('add', scheduleSessionEnd);
  watcher.on('change', scheduleSessionEnd);

  watcher.on('error', (err) => {
    console.error('[watcher] Filesystem error:', err);
  });

  console.log(`[watcher] Watching ${watchDir}/**/*.jsonl (5-min debounce)`);

  return () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    watcher.close();
  };
}
