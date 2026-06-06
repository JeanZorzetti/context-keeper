import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { mergeDecisions, findContextFiles, resolveProjectDir } from '../src/merger.js';

const MARKER_START = '<!-- context-keeper:start';
const MARKER_END = '<!-- context-keeper:end -->';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-merger-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// mergeDecisions — first run
// ---------------------------------------------------------------------------
describe('mergeDecisions — first run (no existing file)', () => {
  it('creates CLAUDE.md with minimal header and managed section', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    mergeDecisions(claudeMd, ['chose Node.js over Go because team familiarity']);

    const content = fs.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain(MARKER_START);
    expect(content).toContain(MARKER_END);
    expect(content).toContain('chose Node.js over Go');
    expect(content).toContain('## Architectural Decisions (auto-captured)');
  });

  it('no-ops when decisions array is empty', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    mergeDecisions(claudeMd, []);
    expect(fs.existsSync(claudeMd)).toBe(false);
  });
});

describe('mergeDecisions — first run (existing file without markers)', () => {
  it('appends managed section to existing content', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '# My Project\n\nManual notes here.\n');

    mergeDecisions(claudeMd, ['decided to use Prisma because team familiarity']);

    const content = fs.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Manual notes here.');
    expect(content).toContain(MARKER_START);
    expect(content).toContain('decided to use Prisma');
  });
});

// ---------------------------------------------------------------------------
// mergeDecisions — subsequent run
// ---------------------------------------------------------------------------
describe('mergeDecisions — subsequent run (markers present)', () => {
  it('replaces only the managed section, preserving manual content above and below', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const initial = `# My Project

Manual notes.

<!-- context-keeper:start (last updated: 2026-01-01T00:00:00.000Z) -->
## Architectural Decisions (auto-captured)

- [2026-01-01] chose React because existing team

<!-- context-keeper:end -->

More manual content below.
`;
    fs.writeFileSync(claudeMd, initial);

    mergeDecisions(claudeMd, ['decided to use Stripe because simplest checkout flow']);

    const content = fs.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('Manual notes.');
    expect(content).toContain('More manual content below.');
    expect(content).toContain('chose React because existing team');
    expect(content).toContain('decided to use Stripe because simplest checkout flow');
  });

  it('deduplicates decisions already present', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const initial = `<!-- context-keeper:start (last updated: 2026-01-01T00:00:00.000Z) -->
## Architectural Decisions (auto-captured)

- [2026-01-01] chose React because existing team

<!-- context-keeper:end -->
`;
    fs.writeFileSync(claudeMd, initial);

    mergeDecisions(claudeMd, ['chose React because existing team']);

    const content = fs.readFileSync(claudeMd, 'utf-8');
    // Should appear only once
    const matches = content.match(/chose React because existing team/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('no-ops when all decisions are duplicates', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    const initial = `<!-- context-keeper:start (last updated: 2026-01-01T00:00:00.000Z) -->
## Architectural Decisions (auto-captured)

- [2026-01-01] chose React because existing team

<!-- context-keeper:end -->
`;
    fs.writeFileSync(claudeMd, initial);
    const before = fs.readFileSync(claudeMd, 'utf-8');

    mergeDecisions(claudeMd, ['chose React because existing team']);

    const after = fs.readFileSync(claudeMd, 'utf-8');
    // Content should be unchanged (no new timestamp written)
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// findContextFiles
// ---------------------------------------------------------------------------
describe('findContextFiles', () => {
  it('returns CLAUDE.md path (to create) when no context files exist', () => {
    const result = findContextFiles(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('CLAUDE.md');
  });

  it('returns existing CLAUDE.md', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '# ctx');
    const result = findContextFiles(tmpDir);
    expect(result).toContain(claudeMd);
  });

  it('returns both CLAUDE.md and AGENTS.md when both exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# ctx');
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# agents');
    const result = findContextFiles(tmpDir);
    expect(result.some((p) => p.endsWith('CLAUDE.md'))).toBe(true);
    expect(result.some((p) => p.endsWith('AGENTS.md'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveProjectDir
// ---------------------------------------------------------------------------
describe('resolveProjectDir', () => {
  it('decodes URL-encoded project path from transcript path', () => {
    const transcriptPath = '/home/user/.claude/projects/%2Fhome%2Fuser%2Fmyproject/abc123.jsonl';
    const result = resolveProjectDir(transcriptPath);
    expect(result).toBe('/home/user/myproject');
  });

  it('returns null for paths with invalid URL encoding', () => {
    const transcriptPath = '/home/user/.claude/projects/%ZZ/abc.jsonl';
    const result = resolveProjectDir(transcriptPath);
    expect(result).toBeNull();
  });
});
