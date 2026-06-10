# Context Keeper Daemon

A daemon that watches Claude Code transcripts, extracts architectural decisions via AI, and automatically updates CLAUDE.md with decision history.

## Quick start (local mode — no account needed)

```bash
export GROQ_API_KEY=gsk_...        # or OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / OLLAMA_BASE_URL
npx @jeanzorzetti/context-keeper install-hooks   # process sessions the moment they end
npx @jeanzorzetti/context-keeper start
```

## Features

- **Instant capture** — registers a Claude Code `SessionEnd` hook; sessions are processed the moment they end (a 5-minute inactivity watcher remains as fallback)
- **Quality-gated extraction** — generic filler decisions ("because it ensures consistency") are filtered out; near-duplicate rephrasings are deduplicated semantically
- **Long-session support** — transcripts beyond the context window are chunked and extracted map-reduce style, so early decisions aren't lost
- **Local-first** — works fully offline with any provider API key (Groq, OpenAI, Anthropic, Gemini, or local Ollama)
- **Resilient dashboard sync** — failed syncs persist to a disk queue and replay automatically
- Automatically maintains `CLAUDE.md` / `AGENTS.md` (capped, marker-delimited section that never touches your edits)
- Optional git auto-commit of context files

## Configuration

Local mode (pick one provider):

| Variable | Provider |
|---|---|
| `GROQ_API_KEY` | Groq (default model: llama-3.3-70b-versatile) |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GEMINI_API_KEY` | Gemini |
| `OLLAMA_BASE_URL` | Ollama (fully offline) |

Optional overrides: `CONTEXT_KEEPER_PROVIDER` (force a provider), `CONTEXT_KEEPER_MODEL`.

Dashboard mode (provider configured at [context.nimblabs.com](https://context.nimblabs.com)):

- `CONTEXT_KEEPER_API_URL` — dashboard URL
- `CONTEXT_KEEPER_TOKEN` — your API token (Settings → API Token)

## Commands

```bash
context-keeper start [--auto-commit]   # start the daemon
context-keeper install-hooks           # register the Claude Code SessionEnd hook
context-keeper extract <path>          # manually extract from a session .jsonl
context-keeper status                  # show daemon status
```

## Development

```bash
npm run dev      # Watch TypeScript compilation
npm run build    # Build distribution
npm test         # Run tests
```
