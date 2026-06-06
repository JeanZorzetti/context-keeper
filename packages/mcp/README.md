# context-keeper-mcp

MCP server that exposes context captured by the context-keeper daemon for injection into the next agent boot.

## Setup (Claude Code)

Add to your Claude Code settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "context-keeper": {
      "command": "npx",
      "args": ["context-keeper-mcp"]
    }
  }
}
```

## Resources

- `context://current` — The context-keeper managed section of the current project's `CLAUDE.md`

## Tools

- `get_decisions` — List recent architectural decisions (JSON, newest first). Optional `limit` param (default 20).
- `inject_context` — Formatted markdown block of the 10 most recent decisions, ready for system prompt injection.

## Index format

The daemon writes `~/.context-keeper/index.json`. The MCP server reads it:

```json
{
  "version": 1,
  "decisions": [
    {
      "id": "uuid",
      "projectPath": "/absolute/path/to/project",
      "projectName": "project",
      "sessionId": "session-basename",
      "text": "chose X over Y because Z",
      "capturedAt": "2026-06-06T10:00:00.000Z"
    }
  ]
}
```
