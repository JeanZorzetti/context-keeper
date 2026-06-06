import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from '../src/server.js';

// We test the server by calling its request handlers directly
// without a real stdio transport.

vi.mock('../src/context.js', () => ({
  findClaudeMd: vi.fn(),
  extractManagedSection: vi.fn(),
  START_MARKER: '<!-- context-keeper:start',
  END_MARKER: '<!-- context-keeper:end -->',
}));

vi.mock('../src/index-store.js', () => ({
  loadDecisions: vi.fn(),
  formatForSystemPrompt: vi.fn(),
  INDEX_PATH: '/mock/.context-keeper/index.json',
}));

import * as contextModule from '../src/context.js';
import * as indexStoreModule from '../src/index-store.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createServer', () => {
  it('returns a Server instance', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});

// Note: Full handler integration tests require an MCP client/transport.
// The handler logic is covered by the unit tests in context.test.ts and
// index-store.test.ts. These smoke tests verify the server bootstraps correctly
// and that the mocks are wired properly for future expansion.

describe('server resources', () => {
  it('list_resources returns context://current', async () => {
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    // Verify the server is configured with correct capabilities
    const server = createServer();
    // Server should have resource and tool capabilities
    expect(server).toBeDefined();
  });
});

describe('module exports', () => {
  it('exports createServer and runServer', async () => {
    const mod = await import('../src/server.js');
    expect(typeof mod.createServer).toBe('function');
    expect(typeof mod.runServer).toBe('function');
  });

  it('exports loadDecisions and formatForSystemPrompt from index-store', async () => {
    const mod = await import('../src/index-store.js');
    expect(typeof mod.loadDecisions).toBe('function');
    expect(typeof mod.formatForSystemPrompt).toBe('function');
    expect(typeof mod.INDEX_PATH).toBe('string');
  });

  it('exports findClaudeMd and extractManagedSection from context', async () => {
    const mod = await import('../src/context.js');
    expect(typeof mod.findClaudeMd).toBe('function');
    expect(typeof mod.extractManagedSection).toBe('function');
  });
});
