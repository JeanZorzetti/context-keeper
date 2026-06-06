import * as fs from 'fs';
import * as path from 'path';

const MARKER_START = '<!-- context-keeper:start';
const MARKER_END = '<!-- context-keeper:end -->';
const SECTION_HEADER = '## Architectural Decisions (auto-captured)';

const MINIMAL_HEADER = `# Project Context\n\n`;

/**
 * Builds the full managed section string (including markers).
 */
function buildManagedSection(decisions: string[], timestamp: string): string {
  const lines = decisions.map((d) => `- [${timestamp.slice(0, 10)}] ${d}`).join('\n');
  return (
    `${MARKER_START} (last updated: ${timestamp}) -->\n` +
    `${SECTION_HEADER}\n\n` +
    `${lines}\n\n` +
    `${MARKER_END}`
  );
}

/**
 * Reads the current content between markers (if any).
 * Returns null if no markers found.
 */
function extractManagedSection(content: string): string | null {
  const startIdx = content.indexOf(MARKER_START);
  if (startIdx === -1) return null;
  const endIdx = content.indexOf(MARKER_END, startIdx);
  if (endIdx === -1) return null;
  return content.slice(startIdx, endIdx + MARKER_END.length);
}

/**
 * Merges new decisions into the managed section.
 *
 * Rules (from spec §6.4):
 * 1. First run: append section to end of existing CLAUDE.md.
 * 2. Subsequent updates: replace only the content between markers.
 * 3. File doesn't exist: create with minimal header + section.
 * 4. Manual edits inside markers: additive merge (new decisions appended, nothing deleted).
 * 5. AGENTS.md: same behaviour.
 */
export function mergeDecisions(filePath: string, newDecisions: string[]): void {
  const timestamp = new Date().toISOString();

  if (newDecisions.length === 0) return;

  // Read existing file (or empty string if not found)
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf-8');
  }

  const currentSection = extractManagedSection(existing);

  if (currentSection === null) {
    // First run or markers not present — append section
    const section = buildManagedSection(newDecisions, timestamp);
    const base = existing.trim() ? existing.trimEnd() + '\n\n' : MINIMAL_HEADER;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, base + section + '\n', 'utf-8');
    return;
  }

  // Extract existing decisions to enable additive merge
  const existingDecisionLines = currentSection
    .split('\n')
    .filter((line) => line.startsWith('- ['));

  // Deduplicate: only add decisions not already present (by text)
  const existingTexts = new Set(existingDecisionLines.map((l) => l.replace(/^- \[\d{4}-\d{2}-\d{2}\] /, '')));
  const deduplicated = newDecisions.filter((d) => !existingTexts.has(d));

  if (deduplicated.length === 0) return;

  const allDecisionLines = [
    ...existingDecisionLines,
    ...deduplicated.map((d) => `- [${timestamp.slice(0, 10)}] ${d}`),
  ];

  const updatedSection =
    `${MARKER_START} (last updated: ${timestamp}) -->\n` +
    `${SECTION_HEADER}\n\n` +
    `${allDecisionLines.join('\n')}\n\n` +
    `${MARKER_END}`;

  const updated = existing.replace(
    new RegExp(
      `${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`,
    ),
    updatedSection,
  );

  fs.writeFileSync(filePath, updated, 'utf-8');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds CLAUDE.md and AGENTS.md starting from projectDir upward (git root detection).
 * Returns all found paths (may be empty).
 */
export function findContextFiles(projectDir: string): string[] {
  const root = findGitRoot(projectDir) ?? projectDir;
  const candidates = [
    path.join(root, 'CLAUDE.md'),
    path.join(root, 'AGENTS.md'),
  ];
  // Return all that exist, or [CLAUDE.md path] as default to create
  const existing = candidates.filter((p) => fs.existsSync(p));
  return existing.length > 0 ? existing : [path.join(root, 'CLAUDE.md')];
}

function findGitRoot(dir: string): string | null {
  let current = path.resolve(dir);
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Resolves the project directory from a transcript file path.
 *
 * Claude Code stores transcripts at:
 *   ~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
 *
 * The directory name is the URL-encoded absolute path of the project.
 */
export function resolveProjectDir(transcriptPath: string): string | null {
  // e.g. /home/user/.claude/projects/%2Fhome%2Fuser%2Fmyproject/abc.jsonl
  const parentDir = path.basename(path.dirname(transcriptPath));
  try {
    return decodeURIComponent(parentDir);
  } catch {
    return null;
  }
}
