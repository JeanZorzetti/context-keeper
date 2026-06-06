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
 * NOTE: Windows encoding is lossy and cannot be reliably decoded without filesystem context.
 * Strategy: Use filesystem walk + git root discovery to find the actual project directory,
 * ensuring projectName (via path.basename) is always correct and readable.
 */
export function resolveProjectDir(transcriptPath: string): string | null {
  const parentDir = path.basename(path.dirname(transcriptPath));

  // Try percent-decoding first (Unix/Linux format: %2F for separator)
  try {
    const decoded = decodeURIComponent(parentDir);
    // Check if it looks like a valid absolute path
    if (decoded.startsWith('/') || decoded.match(/^[a-zA-Z]:/)) {
      // For Unix paths, return as-is (already decoded)
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

      // Search for the real directory by walking from common roots
      // This allows us to derive the correct projectName from the git root's basename
      const searchRoots = [
        path.join(driveRoot, 'Users'),
        path.join(driveRoot, 'Temp'),
        path.join(driveRoot, 'Dev'),
        driveRoot,
      ];

      for (const root of searchRoots) {
        if (fs.existsSync(root)) {
          const found = findProjectRootByEncoding(root, parentDir, 0);
          if (found) return found;
        }
      }

      // If filesystem search fails, return null (unable to resolve)
      // Better to fail safely than return an unverified encoded path
      return null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Searches for a real directory that matches the encoded path pattern,
 * then climbs to find its git root (project root).
 * Returns the git root path, ensuring projectName via path.basename() is correct.
 */
function findProjectRootByEncoding(
  currentPath: string,
  encodedPath: string,
  depth: number,
): string | null {
  if (depth > 6) return null; // Limit recursion depth

  try {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const normalizedName = entry.name.toLowerCase();
      const encodedName = normalizedName.replace(/\s+/g, '-');

      // Check if this directory's encoded name appears in the transcript encoding
      if (encodedPath.includes(encodedName)) {
        const fullPath = path.join(currentPath, entry.name);

        // Found a matching directory — now climb to its git root
        const gitRoot = findGitRoot(fullPath);
        if (gitRoot) {
          // Verify this is a real project (has .git)
          return gitRoot;
        }

        // If no git root found but we matched, continue searching deeper
        // (might be an intermediate directory, not the project root)
        const found = findProjectRootByEncoding(fullPath, encodedPath, depth + 1);
        if (found) return found;
      }
    }
  } catch {
    // Skip on permission errors or other I/O issues
  }

  return null;
}
