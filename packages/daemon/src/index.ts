import 'dotenv/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { startWatcher } from './watcher.js';
import { processTranscript } from './extractor.js';
import { resolveProjectDir, findContextFiles, mergeDecisions } from './merger.js';
import { commitContextFiles } from './git.js';
import { appendToIndex } from './index-writer.js';
import { fetchProviderConfig } from './config.js';
import { watchQueue } from './hook.js';
import { wasProcessed, markProcessed } from './state.js';
import { syncDecisionsToWeb, replayPendingSync } from './sync.js';

export const PID_FILE = path.join(os.homedir(), '.context-keeper', 'daemon.pid');

function writePidFile(): void {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
}

export function removePidFile(): void {
  try { fs.unlinkSync(PID_FILE); } catch { /* already gone */ }
}

export interface DaemonOptions {
  autoCommit?: boolean;
}

/**
 * Starts the Context Keeper daemon.
 *
 * Sessions reach the daemon through two paths:
 * 1. SessionEnd hook queue — instant and exact (install via `context-keeper install-hooks`)
 * 2. Transcript watcher with 5-min inactivity debounce — fallback for users
 *    without the hook, and retry path when hook processing fails
 *
 * The processed-state file keeps the two paths from double-processing.
 *
 * Returns a cleanup function to stop the watchers.
 */
export function startDaemon(options: DaemonOptions = {}): () => void {
  const { autoCommit = false } = options;

  writePidFile();

  const processSession = async (filePath: string): Promise<void> => {
    if (wasProcessed(filePath)) {
      console.log(`[daemon] Skipping unchanged session: ${filePath}`);
      return;
    }

    console.log(`[daemon] Processing session: ${filePath}`);

    const projectDir = resolveProjectDir(filePath);
    if (!projectDir) {
      console.warn(`[daemon] Could not resolve project dir from: ${filePath}`);
      return;
    }

    const config = await fetchProviderConfig();
    if (!config) {
      console.warn('[daemon] No AI provider configured. Either set a provider API key (e.g. GROQ_API_KEY) for local mode, or CONTEXT_KEEPER_API_URL + CONTEXT_KEEPER_TOKEN for dashboard mode. Skipping extraction.');
      return;
    }

    let decisions: string[];
    try {
      decisions = await processTranscript(filePath, config);
    } catch (err) {
      console.error(`[daemon] Extraction failed for ${filePath}:`, err);
      return; // not marked processed — debounce watcher retries later
    }

    if (decisions.length === 0) {
      console.log(`[daemon] No decisions extracted from ${filePath}`);
      markProcessed(filePath);
      return;
    }

    console.log(`[daemon] Extracted ${decisions.length} decision(s):`, decisions);

    // Write to global index (~/.context-keeper/index.json) for MCP server consumption
    const sessionId = path.basename(filePath);
    try {
      appendToIndex(projectDir, sessionId, decisions);
      console.log(`[daemon] Updated index for session ${sessionId}`);
    } catch (err) {
      console.error('[daemon] Failed to update index:', err);
    }

    const contextFiles = findContextFiles(projectDir);
    for (const cf of contextFiles) {
      try {
        mergeDecisions(cf, decisions);
        console.log(`[daemon] Updated ${cf}`);
      } catch (err) {
        console.error(`[daemon] Failed to merge into ${cf}:`, err);
      }
    }

    // Fire-and-forget sync to web dashboard (failures persist to the disk
    // queue inside, never block the local pipeline)
    syncDecisionsToWeb(projectDir, decisions).catch(() => {});

    if (autoCommit) {
      try {
        await commitContextFiles(contextFiles);
        console.log('[daemon] Committed context files');
      } catch (err) {
        console.error('[daemon] Git commit failed:', err);
      }
    }

    markProcessed(filePath);
  };

  // Drain any sync payloads that failed while the daemon was down
  replayPendingSync().catch(() => {});

  const stopQueue = watchQueue(processSession);
  const stopWatcher = startWatcher(processSession);

  return () => {
    stopQueue();
    stopWatcher();
    removePidFile();
  };
}
