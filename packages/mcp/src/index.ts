#!/usr/bin/env node
import { runServer } from './server.js';

runServer().catch((err: unknown) => {
  console.error('[context-keeper-mcp] Fatal error:', err);
  process.exit(1);
});
