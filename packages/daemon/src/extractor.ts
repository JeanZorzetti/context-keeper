import * as fs from 'fs';
import { createProvider } from './providers/factory.js';
import { parseDecisions } from './providers/parse.js';
import type { ProviderConfig } from './providers/types.js';

const MAX_TOKENS = 8000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

export const SYSTEM_PROMPT = `You are an architectural decision extractor. Given a coding session transcript,
extract only concrete architectural decisions made (technology choices, patterns adopted,
constraints identified). Respond with a JSON object of the form {"decisions": [...]} where
the value is an array of strings. Each string: one decision, max 100 chars, past tense,
format "chose X over Y because Z" or "decided to X because Y". Ignore questions, debugging
steps, and implementation details. Max 10 decisions per session. If there are no decisions,
return {"decisions": []}.`;

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

export function formatTranscript(messages: JsonlMessage[]): string {
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

  const full = lines.join('\n\n');
  if (full.length <= MAX_CHARS) return full;

  return '...(truncated)\n\n' + full.slice(full.length - MAX_CHARS);
}

export async function extractDecisions(
  transcript: string,
  config: ProviderConfig,
): Promise<string[]> {
  const provider = createProvider(config);
  const raw = await provider.complete(SYSTEM_PROMPT, transcript);
  return parseDecisions(raw);
}

export async function processTranscript(
  filePath: string,
  config: ProviderConfig,
): Promise<string[]> {
  const messages = readTranscript(filePath);
  if (messages.length === 0) return [];

  const transcript = formatTranscript(messages);
  if (!transcript.trim()) return [];

  return extractDecisions(transcript, config);
}
