/**
 * Near-duplicate detection for decisions, mirroring
 * packages/daemon/src/quality.ts — LLMs rephrase the same decision across
 * sessions, so exact-text dedup alone lets duplicates pile up per project.
 */

const NEAR_DUP_THRESHOLD = 0.6;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

export function isNearDuplicate(
  a: string,
  b: string,
  threshold = NEAR_DUP_THRESHOLD
): boolean {
  return jaccard(new Set(tokenize(a)), new Set(tokenize(b))) >= threshold;
}

/** Order-preserving filter: drops entries near-duplicating `existing` or earlier batch entries. */
export function dedupeNearDuplicates(
  texts: string[],
  existing: string[] = [],
  threshold = NEAR_DUP_THRESHOLD
): string[] {
  const kept: string[] = [];
  for (const text of texts) {
    const duplicate =
      existing.some((e) => isNearDuplicate(text, e, threshold)) ||
      kept.some((k) => isNearDuplicate(text, k, threshold));
    if (!duplicate) kept.push(text);
  }
  return kept;
}
