import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { DecisionEntry, DecisionIndex } from './types.js';

export const INDEX_PATH = path.join(os.homedir(), '.context-keeper', 'index.json');

/**
 * Loads decisions from the index file (defaults to ~/.context-keeper/index.json).
 * Returns sorted (newest first) and capped at `limit`.
 * Returns an empty array if the file does not exist or is malformed.
 */
export async function loadDecisions(limit: number = 20, indexPath: string = INDEX_PATH): Promise<DecisionEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(indexPath, 'utf-8');
  } catch {
    return [];
  }

  let index: DecisionIndex;
  try {
    index = JSON.parse(raw) as DecisionIndex;
  } catch {
    return [];
  }

  if (!Array.isArray(index.decisions)) {
    return [];
  }

  return [...index.decisions]
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, limit);
}

/**
 * Formats a list of decisions into a markdown block ready for
 * injection into a CLAUDE.md preamble or system prompt.
 */
export function formatForSystemPrompt(decisions: DecisionEntry[]): string {
  if (decisions.length === 0) {
    return '<!-- context-keeper: no decisions captured yet -->';
  }

  const lines = decisions.map((d) => {
    const date = d.capturedAt.split('T')[0];
    return `- [${date}] ${d.text}`;
  });

  return `## Architectural Decisions (auto-captured by Context Keeper)\n\n${lines.join('\n')}`;
}
