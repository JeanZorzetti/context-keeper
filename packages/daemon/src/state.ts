import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Tracks which transcripts have already been processed (by mtime), so the
 * hook-driven queue and the debounce fallback watcher never double-process
 * the same session, and resumed sessions are only re-extracted after new
 * content lands.
 */

const STATE_PATH = path.join(os.homedir(), '.context-keeper', 'processed.json');
const MAX_ENTRIES = 500;

interface ProcessedState {
  /** transcriptPath → mtimeMs at the time of processing */
  [transcriptPath: string]: number;
}

function readState(statePath: string): ProcessedState {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8')) as ProcessedState;
  } catch {
    return {};
  }
}

export function wasProcessed(transcriptPath: string, statePath = STATE_PATH): boolean {
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(transcriptPath).mtimeMs;
  } catch {
    return false;
  }
  return readState(statePath)[transcriptPath] === mtimeMs;
}

export function markProcessed(transcriptPath: string, statePath = STATE_PATH): void {
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(transcriptPath).mtimeMs;
  } catch {
    return;
  }

  const state = readState(statePath);
  state[transcriptPath] = mtimeMs;

  // keep the newest MAX_ENTRIES to bound file growth
  const entries = Object.entries(state);
  const trimmed = entries.length > MAX_ENTRIES
    ? Object.fromEntries(entries.slice(entries.length - MAX_ENTRIES))
    : state;

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(trimmed, null, 2) + '\n', 'utf-8');
}
