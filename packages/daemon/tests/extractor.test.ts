import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ---------------------------------------------------------------------------
// Groq SDK mock — hoisted so the factory closure can reference mockCreate
// ---------------------------------------------------------------------------
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = {
      completions: { create: mockCreate },
    };
  },
}));

// Import after mocks are registered
import { readTranscript, formatTranscript, chunkTranscript, extractDecisions, processTranscript } from '../src/extractor.js';
import type { ProviderConfig } from '../src/providers/types.js';

const groqConfig: ProviderConfig = { provider: 'groq', apiKey: 'test-key' };

// ---------------------------------------------------------------------------
// readTranscript
// ---------------------------------------------------------------------------
describe('readTranscript', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-test-'));
    tmpFile = path.join(tmpDir, 'session.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses messages with top-level role field', () => {
    fs.writeFileSync(
      tmpFile,
      [
        JSON.stringify({ role: 'user', content: 'Hello' }),
        JSON.stringify({ role: 'assistant', content: 'Hi there' }),
      ].join('\n'),
    );
    const msgs = readTranscript(tmpFile);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[1].role).toBe('assistant');
  });

  it('parses messages wrapped in a top-level object with message key', () => {
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({ message: { role: 'user', content: 'wrapped' } }),
    );
    const msgs = readTranscript(tmpFile);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('wrapped');
  });

  it('skips empty lines and malformed JSON', () => {
    fs.writeFileSync(tmpFile, '\n{bad json}\n' + JSON.stringify({ role: 'user', content: 'ok' }));
    const msgs = readTranscript(tmpFile);
    expect(msgs).toHaveLength(1);
  });

  it('returns empty array for empty file', () => {
    fs.writeFileSync(tmpFile, '');
    expect(readTranscript(tmpFile)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// formatTranscript
// ---------------------------------------------------------------------------
describe('formatTranscript', () => {
  it('formats string content messages', () => {
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    const result = formatTranscript(msgs);
    expect(result).toContain('[user]: Hello');
    expect(result).toContain('[assistant]: Hi');
  });

  it('concatenates text blocks from array content', () => {
    const msgs = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Part one.' },
          { type: 'tool_use', text: undefined },
          { type: 'text', text: 'Part two.' },
        ],
      },
    ];
    const result = formatTranscript(msgs);
    expect(result).toContain('Part one.');
    expect(result).toContain('Part two.');
  });

  it('truncates long transcripts with sliding window', () => {
    const bigContent = 'x'.repeat(40000);
    const msgs = [{ role: 'user', content: bigContent }];
    const result = formatTranscript(msgs);
    // MAX_CHARS = 8000 * 4 = 32000; result should be ≤ that plus prefix
    expect(result.length).toBeLessThanOrEqual(32000 + 200);
    expect(result).toContain('(truncated)');
  });
});

// ---------------------------------------------------------------------------
// extractDecisions (mocked Groq)
// ---------------------------------------------------------------------------
describe('extractDecisions', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a JSON array returned by Groq', async () => {
    const decisions = [
      'chose Prisma over Drizzle because team familiarity',
      'decided to use Auth0 because SSO requirement',
    ];
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(decisions) } }],
    });

    const result = await extractDecisions('some transcript', groqConfig);
    expect(result).toEqual(decisions);
  });

  it('returns empty array when Groq returns malformed JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json at all' } }],
    });

    const result = await extractDecisions('transcript', groqConfig);
    expect(result).toEqual([]);
  });

  it('strips markdown code fences from Groq response', async () => {
    const decisions = ['decided to use Node.js because vibe coders already have it'];
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: `\`\`\`json\n${JSON.stringify(decisions)}\n\`\`\``,
          },
        },
      ],
    });

    const result = await extractDecisions('transcript', groqConfig);
    expect(result).toEqual(decisions);
  });

  it('caps results at 10 decisions', async () => {
    const decisions = Array.from({ length: 15 }, (_, i) => `decision ${i + 1}`);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(decisions) } }],
    });

    const result = await extractDecisions('transcript', groqConfig);
    expect(result).toHaveLength(10);
  });

  it('drops decisions with generic filler justifications', async () => {
    const decisions = [
      'decided to use version: 1 because it ensures consistency across the system',
      'chose Prisma over Drizzle because team familiarity',
    ];
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(decisions) } }],
    });

    const result = await extractDecisions('transcript', groqConfig);
    expect(result).toEqual(['chose Prisma over Drizzle because team familiarity']);
  });

  it('removes near-duplicate rephrasings within a batch', async () => {
    const decisions = [
      'decided to use version: 1 because the index schema needs migrations',
      'chose to set version to 1 because the index schema needs migrations',
      'chose Auth0 over NextAuth because SSO requirement',
    ];
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(decisions) } }],
    });

    const result = await extractDecisions('transcript', groqConfig);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('decided to use version: 1');
    expect(result[1]).toContain('Auth0');
  });
});

// ---------------------------------------------------------------------------
// chunkTranscript + processTranscript (map-reduce)
// ---------------------------------------------------------------------------
describe('chunkTranscript', () => {
  it('returns a single chunk for short sessions', () => {
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    const chunks = chunkTranscript(msgs);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('[user]: Hello');
  });

  it('splits long sessions into multiple chunks instead of truncating', () => {
    // 5 messages of 10K chars each = 50K chars > 32K MAX_CHARS
    const msgs = Array.from({ length: 5 }, (_, i) => ({
      role: 'user',
      content: `msg${i} ` + 'x'.repeat(10000),
    }));
    const chunks = chunkTranscript(msgs);
    expect(chunks.length).toBeGreaterThan(1);
    // early content must survive (old truncation dropped it)
    expect(chunks[0]).toContain('msg0');
    expect(chunks[chunks.length - 1]).toContain('msg4');
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(32000);
    }
  });
});

describe('processTranscript (map-reduce)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-proc-'));
    mockCreate.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts decisions from every chunk of a long session', async () => {
    const tmpFile = path.join(tmpDir, 'session.jsonl');
    const lines = [
      JSON.stringify({ role: 'user', content: 'early decision talk ' + 'x'.repeat(20000) }),
      JSON.stringify({ role: 'user', content: 'late decision talk ' + 'y'.repeat(20000) }),
    ];
    fs.writeFileSync(tmpFile, lines.join('\n'));

    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"decisions": ["chose Postgres over SQLite because concurrent writers"]}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"decisions": ["decided to cache provider config because dashboard latency"]}' } }],
      });

    const result = await processTranscript(tmpFile, groqConfig);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      'chose Postgres over SQLite because concurrent writers',
      'decided to cache provider config because dashboard latency',
    ]);
  });

  it('salvages other chunks when one chunk fails', async () => {
    const tmpFile = path.join(tmpDir, 'session.jsonl');
    const lines = [
      JSON.stringify({ role: 'user', content: 'a'.repeat(20000) }),
      JSON.stringify({ role: 'user', content: 'b'.repeat(20000) }),
    ];
    fs.writeFileSync(tmpFile, lines.join('\n'));

    mockCreate
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"decisions": ["chose Groq over OpenAI because free tier"]}' } }],
      });

    const result = await processTranscript(tmpFile, groqConfig);
    expect(result).toEqual(['chose Groq over OpenAI because free tier']);
  });
});
