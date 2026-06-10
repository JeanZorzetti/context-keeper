import * as fs from 'fs';
import { createProvider } from './providers/factory.js';
import { parseDecisions } from './providers/parse.js';
import { filterGenericDecisions, dedupeNearDuplicates } from './quality.js';
import type { ProviderConfig } from './providers/types.js';

const MAX_TOKENS = 8000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;
const MAX_CHUNKS = 12; // cost guard for very long sessions
const MAX_DECISIONS_PER_SESSION = 10;

export const SYSTEM_PROMPT = `You are an architectural decision extractor. Given a coding session transcript,
extract only durable architectural decisions: technology choices, patterns adopted,
constraints identified, trade-offs resolved.

A decision is worth extracting ONLY if it would still matter to a developer reading
the project docs a month from now. Apply this test strictly.

DO extract decisions like:
- "chose PostgreSQL over SQLite because multiple daemons write concurrently"
- "decided to lazy-init the Groq client because env vars are missing at build time"
- "adopted additive merge for CLAUDE.md because user edits must never be deleted"

DO NOT extract noise like:
- "decided to use version: 1 because it ensures consistency" (trivial detail, generic reason)
- "chose to update tests to use decisions key because it improves test accuracy" (implementation step)
- "decided to rename X to Y because it improves readability" (refactoring detail)

Rules:
- Each decision: one string, max 100 chars, past tense, format
  "chose X over Y because Z" or "decided to X because Y".
- The "because" clause must state a concrete, project-specific reason — never
  generic filler like "ensures consistency", "improves readability", "follows best practices".
- Ignore questions, debugging steps, refactors, renames, version bumps, and test updates.
- Max 10 decisions per session. Fewer strong decisions beat many weak ones;
  an empty list is a valid answer.

Respond with a JSON object of the form {"decisions": [...]}. If there are no
decisions, return {"decisions": []}.`;

export interface JsonlMessage {
  role: string;
  content: string | Array<{ type: string; text?: string }>;
  timestamp?: string;
}

export function readTranscript(filePath: string): JsonlMessage[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const messages: JsonlMessage[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.message) {
        messages.push(parsed.message as JsonlMessage);
      } else if (parsed.role) {
        messages.push(parsed as JsonlMessage);
      }
    } catch {
      // skip malformed lines
    }
  }

  return messages;
}

function formatMessages(messages: JsonlMessage[]): string[] {
  const lines: string[] = [];

  for (const msg of messages) {
    const role = msg.role ?? 'unknown';
    let text: string;

    if (typeof msg.content === 'string') {
      text = msg.content;
    } else if (Array.isArray(msg.content)) {
      text = msg.content
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text!)
        .join('\n');
    } else {
      text = '';
    }

    if (text.trim()) {
      lines.push(`[${role}]: ${text.trim()}`);
    }
  }

  return lines;
}

export function formatTranscript(messages: JsonlMessage[]): string {
  const full = formatMessages(messages).join('\n\n');
  if (full.length <= MAX_CHARS) return full;

  return '...(truncated)\n\n' + full.slice(full.length - MAX_CHARS);
}

/**
 * Splits a session into chunks that each fit the model context, so long
 * sessions don't lose early decisions to truncation (map-reduce extraction).
 * Sessions beyond MAX_CHUNKS keep the first and last halves — the middle of
 * very long sessions is the least decision-dense part.
 */
export function chunkTranscript(messages: JsonlMessage[]): string[] {
  const lines = formatMessages(messages);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const line of lines) {
    const lineLen = line.length + 2;

    if (lineLen > MAX_CHARS) {
      if (current.length > 0) {
        chunks.push(current.join('\n\n'));
        current = [];
        currentLen = 0;
      }
      chunks.push(line.slice(0, MAX_CHARS));
      continue;
    }

    if (currentLen + lineLen > MAX_CHARS && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentLen = 0;
    }

    current.push(line);
    currentLen += lineLen;
  }

  if (current.length > 0) chunks.push(current.join('\n\n'));

  if (chunks.length > MAX_CHUNKS) {
    return [...chunks.slice(0, MAX_CHUNKS / 2), ...chunks.slice(-MAX_CHUNKS / 2)];
  }

  return chunks;
}

export async function extractDecisions(
  transcript: string,
  config: ProviderConfig,
): Promise<string[]> {
  const provider = createProvider(config);
  const raw = await provider.complete(SYSTEM_PROMPT, transcript);
  return dedupeNearDuplicates(filterGenericDecisions(parseDecisions(raw)));
}

export async function processTranscript(
  filePath: string,
  config: ProviderConfig,
): Promise<string[]> {
  const messages = readTranscript(filePath);
  if (messages.length === 0) return [];

  const chunks = chunkTranscript(messages).filter((c) => c.trim());
  if (chunks.length === 0) return [];

  const all: string[] = [];
  for (const chunk of chunks) {
    try {
      all.push(...(await extractDecisions(chunk, config)));
    } catch (err) {
      // single-chunk sessions keep the old fail-loud behaviour;
      // multi-chunk sessions salvage what the other chunks produced
      if (chunks.length === 1) throw err;
      console.warn('[extractor] Chunk extraction failed, continuing:', err);
    }
  }

  return dedupeNearDuplicates(all).slice(0, MAX_DECISIONS_PER_SESSION);
}
