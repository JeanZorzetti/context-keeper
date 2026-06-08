#!/usr/bin/env node
import 'dotenv/config';
import * as fs from 'fs';
import { startDaemon, PID_FILE } from './index.js';
import { processTranscript } from './extractor.js';
import { resolveProjectDir, findContextFiles, mergeDecisions } from './merger.js';
import { fetchProviderConfig } from './config.js';

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
        console.error('[cli] Could not fetch AI config from dashboard. Set CONTEXT_KEEPER_API_URL + CONTEXT_KEEPER_TOKEN and configure a provider in Settings.');
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

    default: {
      console.log(`Context Keeper v0.1.0

Usage:
  context-keeper start [--auto-commit]   Start the daemon
  context-keeper extract <path>          Manually extract decisions from a session
  context-keeper status                  Show daemon status
`);
    }
  }
}

main().catch((err) => {
  console.error('[cli] Fatal error:', err);
  process.exit(1);
});
