import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { findClaudeMd, extractManagedSection } from './context.js';
import { loadDecisions, formatForSystemPrompt } from './index-store.js';

const CONTEXT_RESOURCE_URI = 'context://current';

/**
 * Creates and configures the MCP server instance.
 * Separated from transport setup to allow unit testing.
 */
export function createServer(): Server {
  const server = new Server(
    { name: 'context-keeper', version: '0.1.0' },
    { capabilities: { resources: {}, tools: {} } }
  );

  // ── Resources ────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: CONTEXT_RESOURCE_URI,
        name: 'Current project context',
        description:
          'Architectural decisions captured from the current project (context-keeper managed section of CLAUDE.md)',
        mimeType: 'text/plain',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== CONTEXT_RESOURCE_URI) {
      throw new Error(`Unknown resource URI: ${request.params.uri}`);
    }

    const projectDir = process.env['PROJECT_DIR'] ?? process.cwd();
    const claudeMdPath = await findClaudeMd(projectDir);

    if (!claudeMdPath) {
      return {
        contents: [
          {
            uri: CONTEXT_RESOURCE_URI,
            mimeType: 'text/plain',
            text: '<!-- context-keeper: no CLAUDE.md found in project tree -->',
          },
        ],
      };
    }

    const section = await extractManagedSection(claudeMdPath);
    return {
      contents: [{ uri: CONTEXT_RESOURCE_URI, mimeType: 'text/plain', text: section }],
    };
  });

  // ── Tools ─────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_decisions',
        description:
          'List recent architectural decisions captured across sessions. Returns JSON array sorted newest first.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of decisions to return (default: 20)',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'inject_context',
        description:
          'Returns a formatted markdown block of the 10 most recent decisions, ready for injection into a system prompt or CLAUDE.md preamble.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'get_decisions') {
      const limit = typeof args?.['limit'] === 'number' ? (args['limit'] as number) : 20;
      const decisions = await loadDecisions(limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(decisions, null, 2) }],
      };
    }

    if (name === 'inject_context') {
      const decisions = await loadDecisions(10);
      return {
        content: [{ type: 'text', text: formatForSystemPrompt(decisions) }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

/**
 * Connects the server to a stdio transport and starts listening.
 */
export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[context-keeper-mcp] Server running on stdio');
}
