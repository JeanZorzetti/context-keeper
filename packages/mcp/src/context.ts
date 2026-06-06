import * as fs from 'fs/promises';
import * as path from 'path';

export const START_MARKER = '<!-- context-keeper:start';
export const END_MARKER = '<!-- context-keeper:end -->';

/**
 * Walks up the directory tree from `startDir` looking for CLAUDE.md.
 * Returns the absolute path if found, null otherwise.
 */
export async function findClaudeMd(startDir: string): Promise<string | null> {
  let dir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(dir, 'CLAUDE.md');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return null; // reached filesystem root
      dir = parent;
    }
  }
}

/**
 * Extracts the content between context-keeper markers from a CLAUDE.md file.
 * Returns an empty string if no managed section exists or the file is unreadable.
 */
export async function extractManagedSection(claudeMdPath: string): Promise<string> {
  let content: string;
  try {
    content = await fs.readFile(claudeMdPath, 'utf-8');
  } catch {
    return '';
  }

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return '';
  }

  return content.slice(startIdx, endIdx + END_MARKER.length);
}
