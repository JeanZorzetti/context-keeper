import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { findClaudeMd, extractManagedSection, START_MARKER, END_MARKER } from '../src/context.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ck-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('findClaudeMd', () => {
  it('finds CLAUDE.md in the given directory', async () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    await fs.writeFile(claudePath, '# test');
    expect(await findClaudeMd(tmpDir)).toBe(claudePath);
  });

  it('finds CLAUDE.md in a parent directory', async () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    await fs.writeFile(claudePath, '# test');
    const subDir = path.join(tmpDir, 'packages', 'mcp', 'src');
    await fs.mkdir(subDir, { recursive: true });
    expect(await findClaudeMd(subDir)).toBe(claudePath);
  });

  it('returns null when no CLAUDE.md exists in the tree', async () => {
    // Use a deeply nested path inside tmpDir with no CLAUDE.md above it within the test's control
    // We rely on the fact that tmpDir itself has no CLAUDE.md
    const subDir = path.join(tmpDir, 'deep', 'nested');
    await fs.mkdir(subDir, { recursive: true });
    // No CLAUDE.md anywhere in tmpDir tree — result is null or a real system CLAUDE.md
    // We can only assert it's not in our subDir
    const result = await findClaudeMd(subDir);
    if (result !== null) {
      // If there is a CLAUDE.md found, it must be outside our tmpDir (a real system file)
      expect(result.startsWith(tmpDir)).toBe(false);
    } else {
      expect(result).toBeNull();
    }
  });
});

describe('extractManagedSection', () => {
  it('extracts the section between markers', async () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    const content = [
      '# My Project',
      '',
      'Some manual content.',
      '',
      `${START_MARKER} (last updated: 2026-06-06T10:00:00Z) -->`,
      '## Architectural Decisions (auto-captured by Context Keeper)',
      '',
      '- [2026-06-06] chose Prisma over Drizzle because team familiarity',
      '',
      END_MARKER,
      '',
      'More manual content.',
    ].join('\n');

    await fs.writeFile(claudePath, content);
    const section = await extractManagedSection(claudePath);

    expect(section).toContain(START_MARKER);
    expect(section).toContain(END_MARKER);
    expect(section).toContain('chose Prisma over Drizzle');
    expect(section).not.toContain('Some manual content');
    expect(section).not.toContain('More manual content');
  });

  it('returns empty string when no markers are present', async () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    await fs.writeFile(claudePath, '# My Project\n\nNo managed section here.');
    expect(await extractManagedSection(claudePath)).toBe('');
  });

  it('returns empty string when file does not exist', async () => {
    const missing = path.join(tmpDir, 'CLAUDE.md');
    expect(await extractManagedSection(missing)).toBe('');
  });

  it('returns empty string when only start marker is present', async () => {
    const claudePath = path.join(tmpDir, 'CLAUDE.md');
    await fs.writeFile(claudePath, `# Project\n\n${START_MARKER} -->\nno end marker`);
    expect(await extractManagedSection(claudePath)).toBe('');
  });
});
