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
 * The directory name is encoded differently on Unix vs Windows:
 * - Unix/Linux/Mac: URL-encoded with %2F for path separators
 * - Windows: dash-encoded, where single dashes replace both path separators (\) AND spaces
 *   Example: c--users-jeanz-onedrive-desktop-roi-labs-context-keeper
 *   Maps to: C:\Users\jeanz\OneDrive\Desktop\ROI Labs\context-keeper
 *
 * NOTE: Windows encoding is lossy (can't distinguish separators from spaces).
 * We extract a readable projectName via path.basename() by reconstructing a
 * candidate path and searching the filesystem. If filesystem lookup fails, we
 * return a fallback path with extracted projectName.
 */
export function resolveProjectDir(transcriptPath: string): string | null {
  const parentDir = path.basename(path.dirname(transcriptPath));

  // Try percent-decoding first (Unix/Linux format: %2F for separator)
  try {
    const decoded = decodeURIComponent(parentDir);
    // Check if it looks like a valid absolute path
    if (decoded.startsWith('/') || decoded.match(/^[a-zA-Z]:/)) {
      return decoded;
    }
  } catch {
    // Fall through to dash-decoding
  }

  // Try dash-decoding for Windows (lossy format: c--users-path-with-spaces-encoding)
  if (parentDir.match(/^[a-z]--/)) {
    try {
      const driveLetter = parentDir[0].toUpperCase();
      const driveRoot = driveLetter + ':';

      // Try to find the real directory by searching common roots
      const searchRoots = [
        path.join(driveRoot, 'Users'),
        path.join(driveRoot, 'Temp'),
        path.join(driveRoot, 'Dev'),
        driveRoot,
      ];

      for (const root of searchRoots) {
        if (fs.existsSync(root)) {
          const found = findDirectoryByEncoding(root, parentDir, 0);
          if (found) return found;
        }
      }

      // Fallback: extract readable projectName and construct a minimal path
      // This ensures path.basename() in index-writer returns something readable
      const projectName = extractProjectNameFromEncoding(parentDir);
      if (projectName) {
        return path.join(driveRoot, projectName);
      }

      return null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Recursively searches for a directory that matches the encoded path pattern.
 * Limits recursion depth to avoid expensive filesystem traversal.
 */
function findDirectoryByEncoding(
  currentPath: string,
  encodedPath: string,
  depth: number,
): string | null {
  if (depth > 5) return null; // Limit recursion depth

  try {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const normalizedName = entry.name.toLowerCase();
      // Check if this entry name appears in the encoded path
      if (encodedPath.includes(normalizedName.replace(/\s+/g, '-'))) {
        const fullPath = path.join(currentPath, entry.name);

        // If we've reached a directory with .git, it's likely the project root
        if (fs.existsSync(path.join(fullPath, '.git'))) {
          return fullPath;
        }

        // Recursively search subdirectories
        const found = findDirectoryByEncoding(fullPath, encodedPath, depth + 1);
        if (found) return found;
      }
    }
  } catch {
    // Skip on permission errors or other I/O issues
  }

  return null;
}

/**
 * Extracts a readable project name from the Windows dash-encoded path.
 * Since encoding is lossy (single dashes = separators OR spaces), we use heuristics:
 * - Take the last 1-3 segments after splitting by `-`
 * - Prefer longer meaningful names over single-char segments
 */
function extractProjectNameFromEncoding(encodedPath: string): string | null {
  if (!encodedPath.match(/^[a-z]--/)) return null;

  const rest = encodedPath.substring(3); // Skip 'X--'
  const segments = rest.split('-').filter((s) => s.length > 0);

  if (segments.length === 0) return null;

  // Try to identify the project directory name by looking at the trailing segments
  // Take the last segment(s) that form a reasonable name (prefer 2-3 segments if they're short)
  for (let i = Math.min(3, segments.length); i >= 1; i--) {
    const candidate = segments.slice(-i).join('-');
    // Prefer if length > 2 (skip single letters or 2-letter acronyms in isolation)
    if (candidate.length > 2 || i === 1) {
      return candidate;
    }
  }

  return segments[segments.length - 1] || null;
}
