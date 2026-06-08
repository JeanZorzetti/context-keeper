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

export const PID_FILE = path.join(os.homedir(), '.context-keeper', 'daemon.pid');

function writePidFile(): void {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
}

export function removePidFile(): void {
  try { fs.unlinkSync(PID_FILE); } catch { /* already gone */ }
}

async function syncDecisionsToWeb(projectPath: string, decisions: string[]): Promise<void> {
  const apiUrl = process.env.CONTEXT_KEEPER_API_URL;
  if (!apiUrl) return; // offline mode — skip silently

  const token = process.env.CONTEXT_KEEPER_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = JSON.stringify({
    projectPath,
    decisions: decisions.map(text => ({ text, createdAt: new Date().toISOString() })),
  });

  const attempt = async (): Promise<void> => {
    const res = await fetch(`${apiUrl}/api/decisions`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { saved: number; skipped: number };
    console.log(`[daemon] Web sync: saved=${json.saved}, skipped=${json.skipped}`);
  };

  try {
    await attempt();
  } catch {
    // one retry after 2 s
    await new Promise(r => setTimeout(r, 2000));
    try {
      await attempt();
    } catch (err) {
      console.warn('[daemon] Web sync failed after retry:', err);
    }
  }
}

export interface DaemonOptions {
  autoCommit?: boolean;
}

/**
 * Starts the Context Keeper daemon.
 * Returns a cleanup function to stop the watcher.
 */
export function startDaemon(options: DaemonOptions = {}): () => void {
  const { autoCommit = false } = options;

  writePidFile();

  const stop = startWatcher(async (filePath) => {
    console.log(`[daemon] Session ended: ${filePath}`);

    const projectDir = resolveProjectDir(filePath);
    if (!projectDir) {
      console.warn(`[daemon] Could not resolve project dir from: ${filePath}`);
      return;
    }

    const config = await fetchProviderConfig();
    if (!config) {
      console.warn('[daemon] Could not fetch AI config from dashboard — set CONTEXT_KEEPER_API_URL + CONTEXT_KEEPER_TOKEN and configure a provider in Settings. Skipping extraction.');
      return;
    }

    let decisions: string[];
    try {
      decisions = await processTranscript(filePath, config);
    } catch (err) {
      console.error(`[daemon] Extraction failed for ${filePath}:`, err);
      return;
    }

    if (decisions.length === 0) {
      console.log(`[daemon] No decisions extracted from ${filePath}`);
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

    // Fire-and-forget sync to web dashboard (errors logged inside, never blocks local pipeline)
    syncDecisionsToWeb(projectDir, decisions).catch(() => {});

    if (autoCommit) {
      try {
        await commitContextFiles(contextFiles);
        console.log('[daemon] Committed context files');
      } catch (err) {
        console.error('[daemon] Git commit failed:', err);
      }
    }
  });

  return () => {
    stop();
    removePidFile();
  };
}
