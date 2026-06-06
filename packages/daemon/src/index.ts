import 'dotenv/config';
import * as path from 'path';
import { startWatcher } from './watcher.js';
import { processTranscript } from './extractor.js';
import { resolveProjectDir, findContextFiles, mergeDecisions } from './merger.js';
import { commitContextFiles } from './git.js';
import { appendToIndex } from './index-writer.js';

export interface DaemonOptions {
  autoCommit?: boolean;
}

/**
 * Starts the Context Keeper daemon.
 * Returns a cleanup function to stop the watcher.
 */
export function startDaemon(options: DaemonOptions = {}): () => void {
  const { autoCommit = false } = options;

  if (!process.env.GROQ_API_KEY) {
    console.error('[daemon] GROQ_API_KEY is not set. Extraction will fail.');
  }

  const stop = startWatcher(async (filePath) => {
    console.log(`[daemon] Session ended: ${filePath}`);

    const projectDir = resolveProjectDir(filePath);
    if (!projectDir) {
      console.warn(`[daemon] Could not resolve project dir from: ${filePath}`);
      return;
    }

    let decisions: string[];
    try {
      decisions = await processTranscript(filePath);
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

    if (autoCommit) {
      try {
        await commitContextFiles(contextFiles);
        console.log('[daemon] Committed context files');
      } catch (err) {
        console.error('[daemon] Git commit failed:', err);
      }
    }
  });

  return stop;
}
