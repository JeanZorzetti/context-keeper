import * as fs from 'fs';
import Groq from 'groq-sdk';

const MAX_TOKENS = 8000;
const CHARS_PER_TOKEN = 4; // rough estimate
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

const SYSTEM_PROMPT = `You are an architectural decision extractor. Given a coding session transcript,
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

/**
 * Reads a .jsonl file and returns its messages.
 */
export function readTranscript(filePath: string): JsonlMessage[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const messages: JsonlMessage[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      // Claude Code JSONL can wrap messages inside a top-level object
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

/**
 * Converts messages array to a plain-text transcript, capped at MAX_CHARS.
 * Prioritises recent messages (sliding window from the end).
 */
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

  // Sliding window: take the last MAX_CHARS characters
  return '...(truncated)\n\n' + full.slice(full.length - MAX_CHARS);
}

/**
 * Calls Groq to extract architectural decisions from a transcript.
 * Returns an array of decision strings (may be empty).
 */
export async function extractDecisions(transcript: string): Promise<string[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Transcript:\n\n${transcript}` },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    // Native JSON mode guarantees parseable output — no markdown fences to strip.
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(raw);
    // Accept {"decisions": [...]}, a bare array, or any object whose first
    // array value holds the decisions (defensive against prompt drift).
    const arr: unknown = Array.isArray(parsed)
      ? parsed
      : parsed.decisions ?? Object.values(parsed).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) {
      return (arr as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
    }
  } catch {
    // Groq returned something unexpected — return empty
  }

  return [];
}

/**
 * Full pipeline: read JSONL → format → extract decisions via Groq.
 */
export async function processTranscript(filePath: string): Promise<string[]> {
  const messages = readTranscript(filePath);
  if (messages.length === 0) return [];

  const transcript = formatTranscript(messages);
  if (!transcript.trim()) return [];

  return extractDecisions(transcript);
}
