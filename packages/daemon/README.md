# Context Keeper Daemon

A daemon that watches Claude Code transcripts, extracts architectural decisions via Groq AI, and automatically updates CLAUDE.md with decision history.

## Installation

```bash
npx @jeanzorzetti/context-keeper start
```

## Features

- Watches Claude Code transcript directories for new entries
- Extracts decisions using Groq API
- Automatically maintains CLAUDE.md with decision metadata
- Git integration for tracking changes

## Configuration

Set up environment variables in `.env`:

- `GROQ_API_KEY` - Groq API key for decision extraction
- `CLAUDE_PATH` - Path to watch for Claude Code transcripts (default: current directory)

## Usage

Start the daemon:
```bash
npx @jeanzorzetti/context-keeper start
```

The daemon will:
1. Watch your Claude Code transcript directory
2. Detect new decisions
3. Extract context via Groq
4. Update CLAUDE.md with indexed decisions

## Development

```bash
npm run dev      # Watch TypeScript compilation
npm run build    # Build distribution
npm test         # Run tests
```
