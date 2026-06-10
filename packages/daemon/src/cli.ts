#!/usr/bin/env node
import 'dotenv/config';
import * as fs from 'fs';
import { startDaemon, PID_FILE } from './index.js';
import { processTranscript } from './extractor.js';
import { resolveProjectDir, findContextFiles, mergeDecisions } from './merger.js';
import { fetchProviderConfig } from './config.js';
import { enqueueFromHookPayload, installSessionEndHook } from './hook.js';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'start': {
      const autoCommit = args.includes('--auto-commit');
      console.log('[cli] Starting Context Keeper daemon...');
      const stop = startDaemon({ autoCommit });

      process.on('SIGINT', () => {
        console.log('\n[cli] Shutting down...');
        stop();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        stop();
        process.exit(0);
      });
      break;
    }

    case 'extract': {
      const filePath = args[0];
      if (!filePath) {
        console.error('Usage: context-keeper extract <path-to-session.jsonl>');
        process.exit(1);
      }

      const config = await fetchProviderConfig();
      if (!config) {
        console.error('[cli] No AI provider configured. Either set a provider API key (e.g. GROQ_API_KEY) for local mode, or CONTEXT_KEEPER_API_URL + CONTEXT_KEEPER_TOKEN for dashboard mode.');
        process.exit(1);
      }

      console.log(`[cli] Extracting decisions from: ${filePath}`);
      const decisions = await processTranscript(filePath, config);

      if (decisions.length === 0) {
        console.log('[cli] No architectural decisions found.');
        return;
      }

      console.log(`[cli] Found ${decisions.length} decision(s):`);
      decisions.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));

      const projectDir = resolveProjectDir(filePath);
      if (projectDir) {
        const contextFiles = findContextFiles(projectDir);
        for (const cf of contextFiles) {
          mergeDecisions(cf, decisions);
          console.log(`[cli] Updated ${cf}`);
        }
      } else {
        console.warn('[cli] Could not resolve project dir — skipping file update.');
      }
      break;
    }

    case 'status': {
      try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        try {
          process.kill(pid, 0);
          console.log(`Context Keeper: running (PID: ${pid})`);
        } catch {
          console.log('Context Keeper: not running (stale PID file)');
        }
      } catch {
        console.log('Context Keeper: not running');
      }
      break;
    }

    case 'hook-event': {
      // Invoked by the Claude Code SessionEnd hook; payload arrives on stdin.
      // Always exits 0 — a failing hook must never disturb session shutdown.
      try {
        const payload = await readStdin();
        const entryPath = enqueueFromHookPayload(payload);
        if (entryPath) {
          console.log(`[hook] Enqueued session for processing: ${entryPath}`);
        }
      } catch (err) {
        console.error('[hook] Failed to enqueue session:', err);
      }
      process.exit(0);
      break;
    }

    case 'install-hooks': {
      const { settingsPath, status } = installSessionEndHook();
      if (status === 'installed') {
        console.log(`[cli] SessionEnd hook installed in ${settingsPath}`);
        console.log('[cli] Sessions will now be processed the moment they end (no 5-min wait).');
      } else {
        console.log(`[cli] SessionEnd hook already installed in ${settingsPath}`);
      }
      break;
    }

    default: {
      console.log(`Context Keeper

Usage:
  context-keeper start [--auto-commit]   Start the daemon
  context-keeper extract <path>          Manually extract decisions from a session
  context-keeper status                  Show daemon status
  context-keeper install-hooks           Register the Claude Code SessionEnd hook
  context-keeper hook-event              (internal) called by the SessionEnd hook
`);
    }
  }
}

main().catch((err) => {
  console.error('[cli] Fatal error:', err);
  process.exit(1);
});
