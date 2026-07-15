# Context Keeper

Daemon que lê os transcripts do Claude Code, extrai as **decisões** tomadas durante
o trabalho (via Groq) e sincroniza com um dashboard, para que o contexto de um
projeto não se perca entre sessões.

No ar em [context.nimblabs.com](https://context.nimblabs.com) · publicado no npm como
[`@jeanzorzetti/context-keeper`](https://www.npmjs.com/package/@jeanzorzetti/context-keeper).

## Monorepo

Workspace pnpm com três pacotes:

| Pasta | O que é |
|-------|---------|
| [`packages/daemon`](packages/daemon) | Daemon Node — observa os transcripts e extrai decisões via Groq |
| [`packages/mcp`](packages/mcp) | Servidor MCP para consultar o contexto guardado |
| [`apps/web`](apps/web) | Dashboard web |

## Rodar localmente

```bash
pnpm install
pnpm dev:web      # dashboard
pnpm build:web
pnpm test:web
```

Infra de apoio (banco/serviços) via [`docker-compose.yml`](docker-compose.yml).

## Configuração

O daemon precisa de uma chave da Groq para extrair as decisões. Consulte
[`docs/`](docs) e [`CLAUDE.md`](CLAUDE.md) para as variáveis de ambiente.

> **Nota de segurança:** o `User.apiToken` ainda é armazenado sem hash — pendência
> conhecida antes de expor o dashboard publicamente.
