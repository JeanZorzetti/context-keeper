import * as fs from 'fs';
import * as path from 'path';
import { dedupeNearDuplicates } from './quality.js';

const MARKER_START = '<!-- context-keeper:start';
const MARKER_END = '<!-- context-keeper:end -->';
const SECTION_HEADER = '## Architectural Decisions (auto-captured)';

/** Hard cap on the managed section so CLAUDE.md never grows unboundedly. */
const MAX_SECTION_DECISIONS = 50;

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

  // Deduplicate semantically: LLMs rephrase the same decision across sessions,
  // so exact-text comparison alone lets near-duplicates accumulate forever
  const existingTexts = existingDecisionLines.map((l) => l.replace(/^- \[\d{4}-\d{2}-\d{2}\] /, ''));
  const deduplicated = dedupeNearDuplicates(newDecisions, existingTexts);

  if (deduplicated.length === 0) return;

  // Cap the section at the newest MAX_SECTION_DECISIONS entries
  const allDecisionLines = [
    ...existingDecisionLines,
    ...deduplicated.map((d) => `- [${timestamp.slice(0, 10)}] ${d}`),
  ].slice(-MAX_SECTION_DECISIONS);

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
 * Resolves the project directory from a transcript file.
 *
 * Primary: Claude Code transcript JSONL lines carry a `cwd` field with the
 * absolute project path — exact on every OS, no decoding needed.
 * Fallback (e.g. empty/unreadable transcript): percent-decode the transcript's
 * parent directory name (~/.claude/projects/<encoded-path>/<session>.jsonl).
 * The Windows dash-encoding is lossy and is NOT decoded — cwd covers it.
 */
export function resolveProjectDir(transcriptPath: string): string | null {
  const fromTranscript = readCwdFromTranscript(transcriptPath);
  if (fromTranscript) return fromTranscript;

  const parentDir = path.basename(path.dirname(transcriptPath));
  try {
    const decoded = decodeURIComponent(parentDir);
    if (decoded.startsWith('/') || /^[a-zA-Z]:/.test(decoded)) {
      return decoded;
    }
  } catch {
    // invalid percent-encoding
  }

  return null;
}

const CWD_SCAN_MAX_LINES = 100;

function readCwdFromTranscript(transcriptPath: string): string | null {
  let raw: string;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf-8');
  } catch {
    return null;
  }

  let scanned = 0;
  for (const line of raw.split('\n')) {
    if (scanned >= CWD_SCAN_MAX_LINES) break;
    const trimmed = line.trim();
    if (!trimmed) continue;
    scanned++;
    try {
      const parsed = JSON.parse(trimmed) as { cwd?: unknown };
      if (typeof parsed.cwd === 'string' && parsed.cwd.length > 0) {
        return parsed.cwd;
      }
    } catch {
      // skip malformed lines
    }
  }

  return null;
}
