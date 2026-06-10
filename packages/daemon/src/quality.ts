/**
 * Quality gate for extracted decisions.
 *
 * Two failure modes observed in production output:
 * 1. Trivial decisions with generic filler justifications
 *    ("decided to use version: 1 because it ensures consistency across the system")
 * 2. Near-duplicate rephrasings that exact-text dedup misses
 *    ("decided to use version: 1 ..." vs "chose to set version to 1 ...")
 */

const NEAR_DUP_THRESHOLD = 0.6;

/**
 * Vocabulary that carries no project-specific information inside a
 * justification clause. If the entire "because ..." clause is built from
 * these words, the justification says nothing and the decision is noise.
 */
const GENERIC_WORDS = new Set([
  // function words
  'it', 'its', 'is', 'a', 'an', 'the', 'and', 'or', 'of', 'in', 'to', 'for',
  'with', 'this', 'that', 'they', 'their', 'them', 'there', 'these', 'those',
  'be', 'are', 'was', 'were', 'will', 'can', 'as', 'by', 'on', 'at',
  // generic verbs
  'ensures', 'ensure', 'ensuring', 'improves', 'improve', 'improving',
  'provides', 'provide', 'providing', 'increases', 'increase', 'enhances',
  'enhance', 'simplifies', 'simplify', 'aligns', 'align', 'follows', 'follow',
  'makes', 'make', 'keeps', 'keep', 'helps', 'help', 'allows', 'allow',
  // generic qualities
  'consistency', 'consistent', 'readability', 'readable', 'maintainability',
  'maintainable', 'accuracy', 'accurate', 'efficiency', 'efficient',
  'reliability', 'reliable', 'clarity', 'clear', 'clean', 'cleaner',
  'simplicity', 'simple', 'simpler', 'better', 'easier', 'good', 'best',
  'practice', 'practices', 'standard', 'standards', 'structure', 'structured',
  'convention', 'conventions', 'quality', 'overall', 'more', 'provenance',
  // generic subjects
  'code', 'data', 'system', 'codebase', 'project', 'across', 'naming',
  'name', 'names', 'test', 'tests', 'testing',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * True when the decision's "because ..." clause contains zero
 * project-specific words. Decisions without a "because" clause pass through.
 */
export function isGenericJustification(decision: string): boolean {
  const match = decision.match(/\bbecause\b([\s\S]+)$/i);
  if (!match) return false;
  const words = tokenize(match[1]);
  if (words.length === 0) return true;
  return words.every((w) => GENERIC_WORDS.has(w));
}

export function filterGenericDecisions(decisions: string[]): string[] {
  return decisions.filter((d) => !isGenericJustification(d));
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
  threshold = NEAR_DUP_THRESHOLD,
): boolean {
  return jaccard(new Set(tokenize(a)), new Set(tokenize(b))) >= threshold;
}

/**
 * Removes decisions that are near-duplicates of `existing` entries or of
 * earlier entries in the same batch. Order-preserving (first wins).
 */
export function dedupeNearDuplicates(
  decisions: string[],
  existing: string[] = [],
  threshold = NEAR_DUP_THRESHOLD,
): string[] {
  const kept: string[] = [];
  for (const decision of decisions) {
    const duplicate =
      existing.some((e) => isNearDuplicate(decision, e, threshold)) ||
      kept.some((k) => isNearDuplicate(decision, k, threshold));
    if (!duplicate) kept.push(decision);
  }
  return kept;
}
