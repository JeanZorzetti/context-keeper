import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { DecisionIndex } from '../src/types.js';

let tmpDir: string;

// We override INDEX_PATH by mocking the module — simpler to test the pure functions directly
// by re-implementing the logic in test helpers.

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ck-idx-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// Helper: write a test index to a file and return a loadDecisions function bound to it
async function writeIndex(filePath: string, data: DecisionIndex): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data));
}

// We test the pure formatting function directly (no I/O)
import { formatForSystemPrompt } from '../src/index-store.js';
import type { DecisionEntry } from '../src/types.js';

const makeDecision = (overrides: Partial<DecisionEntry> = {}): DecisionEntry => ({
  id: 'test-id',
  projectPath: '/home/user/myproject',
  projectName: 'myproject',
  sessionId: 'session-abc',
  text: 'chose TypeScript over JavaScript because type safety',
  capturedAt: '2026-06-06T10:00:00.000Z',
  ...overrides,
});

describe('formatForSystemPrompt', () => {
  it('returns a placeholder when decisions array is empty', () => {
    const result = formatForSystemPrompt([]);
    expect(result).toContain('no decisions captured yet');
  });

  it('formats decisions as a markdown list', () => {
    const decisions = [
      makeDecision({ text: 'chose Prisma over Drizzle because familiarity', capturedAt: '2026-06-05T09:00:00.000Z' }),
      makeDecision({ text: 'decided to use Auth0 because SSO requirement', capturedAt: '2026-06-06T10:00:00.000Z' }),
    ];
    const result = formatForSystemPrompt(decisions);
    expect(result).toContain('## Architectural Decisions');
    expect(result).toContain('- [2026-06-05] chose Prisma over Drizzle');
    expect(result).toContain('- [2026-06-06] decided to use Auth0');
  });

  it('uses only the date part of capturedAt', () => {
    const result = formatForSystemPrompt([makeDecision({ capturedAt: '2026-01-15T23:59:59.000Z' })]);
    expect(result).toContain('[2026-01-15]');
    expect(result).not.toContain('T23:59');
  });
});

// Test loadDecisions using real files in tmpDir (no vi.spyOn — ESM namespaces are immutable)
describe('loadDecisions (via real files)', () => {
  it('returns empty array when index file does not exist', async () => {
    const { loadDecisions } = await import('../src/index-store.js');
    const missing = path.join(tmpDir, 'nonexistent.json');
    const result = await loadDecisions(20, missing);
    expect(result).toEqual([]);
  });

  it('returns empty array when index file contains invalid JSON', async () => {
    const { loadDecisions } = await import('../src/index-store.js');
    const indexPath = path.join(tmpDir, 'index.json');
    await fs.writeFile(indexPath, 'not json');
    const result = await loadDecisions(20, indexPath);
    expect(result).toEqual([]);
  });

  it('returns decisions sorted newest first', async () => {
    const { loadDecisions } = await import('../src/index-store.js');
    const index: DecisionIndex = {
      version: 1,
      decisions: [
        makeDecision({ id: '1', capturedAt: '2026-06-01T00:00:00.000Z', text: 'old decision' }),
        makeDecision({ id: '3', capturedAt: '2026-06-06T00:00:00.000Z', text: 'newest decision' }),
        makeDecision({ id: '2', capturedAt: '2026-06-03T00:00:00.000Z', text: 'middle decision' }),
      ],
    };
    const indexPath = path.join(tmpDir, 'index.json');
    await writeIndex(indexPath, index);
    const result = await loadDecisions(20, indexPath);
    expect(result[0].text).toBe('newest decision');
    expect(result[1].text).toBe('middle decision');
    expect(result[2].text).toBe('old decision');
  });

  it('respects the limit parameter', async () => {
    const { loadDecisions } = await import('../src/index-store.js');
    const decisions = Array.from({ length: 10 }, (_, i) =>
      makeDecision({ id: String(i), capturedAt: `2026-06-0${i + 1}T00:00:00.000Z`, text: `decision ${i}` })
    );
    const index: DecisionIndex = { version: 1, decisions };
    const indexPath = path.join(tmpDir, 'index.json');
    await writeIndex(indexPath, index);
    const result = await loadDecisions(3, indexPath);
    expect(result).toHaveLength(3);
  });
});
