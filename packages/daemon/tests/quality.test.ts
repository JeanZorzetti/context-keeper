import { describe, it, expect } from 'vitest';
import {
  isGenericJustification,
  filterGenericDecisions,
  isNearDuplicate,
  dedupeNearDuplicates,
} from '../src/quality.js';

// Real noise captured in production (this repo's own CLAUDE.md)
const PRODUCTION_NOISE = [
  'decided to use version: 1 because it ensures consistency across the system',
  'chose to set version to 1 because it ensures consistency across the system',
  'decided to use decisions array instead of entries because it improves code readability and maintainability',
  'chose DecisionIndex interface over custom implementation because it provides a standard structure',
  'decided to update tests to use decisions key because it improves test accuracy',
];

const GOOD_DECISIONS = [
  'chose PostgreSQL over SQLite because multiple daemons write concurrently',
  'decided to lazy-init the Groq client because env vars are missing at build time',
  'chose Prisma over Drizzle because team familiarity',
  'decided to use DecisionEntry interface because it aligns with MCP canonical types',
];

describe('isGenericJustification', () => {
  it('flags production noise with filler justifications', () => {
    for (const noise of PRODUCTION_NOISE) {
      expect(isGenericJustification(noise), noise).toBe(true);
    }
  });

  it('keeps decisions with concrete, project-specific reasons', () => {
    for (const good of GOOD_DECISIONS) {
      expect(isGenericJustification(good), good).toBe(false);
    }
  });

  it('lets decisions without a because-clause pass through', () => {
    expect(isGenericJustification('adopted pgvector for embedding storage')).toBe(false);
  });
});

describe('filterGenericDecisions', () => {
  it('removes only the generic entries from a mixed batch', () => {
    const result = filterGenericDecisions([...PRODUCTION_NOISE, ...GOOD_DECISIONS]);
    expect(result).toEqual(GOOD_DECISIONS);
  });
});

describe('isNearDuplicate', () => {
  it('detects rephrasings of the same decision', () => {
    expect(
      isNearDuplicate(
        'decided to use version: 1 because the index schema needs migrations',
        'chose to set version to 1 because the index schema needs migrations',
      ),
    ).toBe(true);
  });

  it('does not flag distinct decisions about the same component', () => {
    expect(
      isNearDuplicate(
        'chose JWT over sessions because stateless scaling',
        'chose JWT expiry of 15m because security policy',
      ),
    ).toBe(false);
  });
});

describe('dedupeNearDuplicates', () => {
  it('drops batch entries that near-duplicate existing decisions', () => {
    const existing = ['decided to use version: 1 because the index schema needs migrations'];
    const incoming = [
      'chose to set version to 1 because the index schema needs migrations',
      'chose Auth0 over NextAuth because SSO requirement',
    ];
    expect(dedupeNearDuplicates(incoming, existing)).toEqual([
      'chose Auth0 over NextAuth because SSO requirement',
    ]);
  });

  it('keeps the first of duplicates within the same batch', () => {
    const incoming = [
      'chose Postgres over SQLite because concurrent writers',
      'decided to choose Postgres over SQLite because concurrent writers',
    ];
    expect(dedupeNearDuplicates(incoming)).toEqual([
      'chose Postgres over SQLite because concurrent writers',
    ]);
  });
});
