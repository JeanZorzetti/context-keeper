# Context Keeper — Spec de Implementação v0.1

**Data:** 2026-06-06
**Status:** SPEC (fundação — bloqueia implementação)
**Base:** [00-discovery.md](./00-discovery.md) — decisões ✅ da §5 NÃO re-litigadas aqui.

---

## 1. Resumo executivo

Context Keeper é um **Context Lifecycle Manager para AI coding agents** composto de três peças:
um daemon local que lê transcritos de sessão e atualiza `CLAUDE.md`/`AGENTS.md` automaticamente,
um MCP server que injeta o contexto capturado no boot do próximo agente, e um web dashboard
com billing. MVP foca Claude Code; expansão multi-tool via MCP vem depois.

---

## 2. Questões abertas resolvidas (§6)

### §6.1 — Acesso ao transcript: **Claude Code-first**

**Decisão:** MVP lê exclusivamente `~/.claude/projects/**/*.jsonl`.

**Justificativa:** Formato bem documentado (precedente Compass), acessível via filesystem local
sem engenharia reversa. Cursor/Windsurf usam formatos proprietários opacos — custo de suporte
alto para validação desconhecida. Expandir para Cursor após primeiro usuário pagante.

Cada arquivo `.jsonl` contém um array de mensagens da sessão (role + content). O daemon lê
o arquivo completo ao detectar fim de sessão.

---

### §6.2 — Gatilho de extração: **File watcher com inatividade de 5 minutos**

**Decisão:** O daemon usa um watcher de filesystem em `~/.claude/projects/`. Quando um
arquivo `.jsonl` não é modificado por **5 minutos** após ter crescido (mtime estável),
a sessão é considerada encerrada e a extração é disparada.

**Justificativa:**
- Verdadeiramente passivo — zero ação do dev.
- Não depende de hooks de Claude Code (que podem mudar entre versões).
- Debounce de 5 min cobre pausas normais sem falsos positivos.
- Fallback: comando manual `context-keeper extract <session-id>` para depuração.

Implementação Node: `chokidar` para watch + `setTimeout` de 5 min por arquivo modificado.

---

### §6.3 — Onde a extração roda: **Daemon local + Groq API**

**Decisão:** Extração roda inteiramente no daemon local. Única chamada externa: Groq API
para o LLM de extração.

**Custo estimado por sessão:**
- Transcript típico: 50–200k tokens de diálogo bruto.
- Prompt de extração enviado ao Groq: resumo de até **8k tokens** (janela deslizante sobre
  o transcript). Saída: ~500–1000 tokens de decisões.
- Custo Groq (`llama-3.3-70b-versatile`): ~$0.59/1M input → **< $0.01 por sessão**.

Groq key fica no `.env` local do usuário. Sem servidor intermediário no MVP.

---

### §6.4 — Formato de saída: **Seção gerenciada com markers no CLAUDE.md**

**Decisão:** O daemon insere/atualiza uma seção delimitada dentro do `CLAUDE.md` (ou
`AGENTS.md`) do projeto. Fora dos markers = zona manual do dev, **nunca tocada**.

**Estratégia de merge:**

```
<!-- context-keeper:start (last updated: 2026-06-06T14:32:00Z) -->
## Architectural Decisions (auto-captured)

- [2026-06-06] Chose Prisma 7 over Drizzle: team familiarity + Compass precedent.
- [2026-06-06] Auth via Auth0 (not NextAuth): SSO requirement for team plan.

<!-- context-keeper:end -->
```

Regras:
1. **Primeira execução:** appenda a seção ao final do `CLAUDE.md` existente.
2. **Atualizações subsequentes:** substitui apenas o conteúdo entre os markers.
3. **Arquivo inexistente:** cria `CLAUDE.md` com a seção gerenciada e um header mínimo.
4. **Conflito de edição manual dentro da zona:** detectado por diff — se o dev editou dentro
   dos markers manualmente, o daemon preserva e faz merge aditivo (novas decisões ficam
   abaixo do conteúdo existente, nunca deletando).
5. **AGENTS.md:** mesmo comportamento; daemon atualiza ambos se existirem.

---

### §6.5 — MCP server: resources e tools

**Decisão:** Expõe 3 endpoints. Claude Code-first; tool-agnostic por design (stdio transport).

| Endpoint | Tipo | Descrição |
|---|---|---|
| `get_context` | Resource (`context://current`) | Retorna o conteúdo da seção gerenciada do projeto ativo |
| `get_decisions` | Tool | Lista decisões das últimas N sessões com timestamp e projeto |
| `inject_context` | Tool | Retorna string formatada pronta para injeção no system prompt |

**Descoberta de projeto ativo:** MCP server detecta o diretório de trabalho via variável de
ambiente `PROJECT_DIR` (injetada pelo Claude Code ao iniciar) ou fallback para `cwd`.

Configuração no `claude_code_settings.json` do usuário:
```json
{
  "mcpServers": {
    "context-keeper": {
      "command": "npx",
      "args": ["context-keeper", "mcp"]
    }
  }
}
```

---

### §6.6 — Pricing concreto e kill criterion

**Pricing:**

| Plano | Preço | Limite |
|---|---|---|
| Personal | $19/mês | 5 projetos, 1 ferramenta (Claude Code) |
| Pro | $49/mês | Projetos ilimitados + multi-tool sync (quando disponível) |
| Lifetime early-bird | $149 one-time | Pro features, 100 primeiros usuários |
| Teams | $20/dev/mês | Mínimo 3 devs, billing consolidado |

**Kill criterion (padrão Compass):** Se em **D+90 (2026-09-04)** não houver nenhum
usuário pagante ativo → projeto encerrado. Sem excessões.

Milestone intermediário: **1 usuário pagante em D+30 (2026-07-06)** = continuar investindo.

---

## 3. Stack do daemon: **Node.js**

**Decisão: Node.js** (não Go).

| Critério | Node | Go | Decisão |
|---|---|---|---|
| Stack da equipe | ✅ Já usa (Next.js) | ⚠️ Novo contexto | Node |
| SDK Groq | ✅ Oficial | ⚠️ Unofficial/manual | Node |
| Distribuição | ✅ `npx context-keeper` | Binário Go (cross-compile) | Node (UX melhor p/ vibe coders) |
| Footprint | ⚠️ Requer Node runtime | ✅ Single binary | Go |
| Dev velocity | ✅ Mais rápido | ⚠️ Mais lento | Node |
| Performance | ✅ Suficiente p/ file watch | ✅ Superior | Empate (file watch não precisa de Go) |

**Justificativa final:** O público-alvo (vibe coders) já tem Node instalado. `npx context-keeper`
é o menor atrito possível de instalação. A complexidade do daemon (file watch + API call + write)
não justifica a curva de Go. Se distribuição como binário standalone se tornar blocker, compilar
com `bun build --compile` gera binário único sem runtime.

**Versão mínima:** Node 20 LTS (já padrão em 2026).

---

## 4. Arquitetura das 3 peças

### 4.1 CORE Daemon (`packages/daemon`)

**Responsabilidade:** Observar transcritos, extrair decisões com Groq, atualizar arquivos de contexto.

**Fluxo:**
```
~/.claude/projects/**/*.jsonl
        │
        ▼  (chokidar watch)
   file changed?
        │
        ▼  (debounce 5 min)
   session_ended(filePath)
        │
        ▼
   read_transcript(filePath)
        │  → até 8k tokens (sliding window, prioriza mensagens recentes)
        ▼
   groq_extract(transcript)
        │  → ["Decision: chose X over Y because Z", ...]
        ▼
   resolve_project(filePath)
        │  → encontra CLAUDE.md do projeto via git root
        ▼
   merge_into_context_file(decisions, claudeMdPath)
        │
        ▼
   git_commit(claudeMdPath, "chore: update context-keeper decisions")  ← opcional, flag --auto-commit
```

**Prompt de extração Groq (sistema):**
```
You are an architectural decision extractor. Given a coding session transcript,
extract only concrete architectural decisions made (technology choices, patterns adopted,
constraints identified). Output as a JSON array of strings. Each string: one decision,
max 100 chars, past tense, format "chose X over Y because Z" or "decided to X because Y".
Ignore questions, debugging steps, and implementation details. Max 10 decisions per session.
```

**Estrutura de arquivos:**
```
packages/daemon/
  src/
    watcher.ts      # chokidar setup, debounce
    extractor.ts    # lê JSONL, formata prompt, chama Groq
    merger.ts       # lê/escreve CLAUDE.md com markers
    git.ts          # git commit opcional
    index.ts        # entry point (start daemon)
  tests/
    extractor.test.ts
    merger.test.ts
```

**CLI:**
```bash
npx context-keeper start          # inicia daemon
npx context-keeper extract <path> # extração manual de um .jsonl
npx context-keeper status         # sessões monitoradas
```

---

### 4.2 MCP Server (`packages/mcp`)

**Responsabilidade:** Expor contexto capturado para injeção no boot do próximo agente.

**Transport:** stdio (padrão Claude Code).

**Implementação:** `@modelcontextprotocol/sdk` (Node).

```typescript
// Resources
server.resource("context://current", async () => {
  const claudeMd = await findClaudeMd(process.env.PROJECT_DIR ?? process.cwd());
  return extractManagedSection(claudeMd); // conteúdo entre markers
});

// Tools
server.tool("get_decisions", { limit: z.number().default(20) }, async ({ limit }) => {
  return loadDecisionsIndex(limit); // de ~/.context-keeper/index.json
});

server.tool("inject_context", {}, async () => {
  const decisions = await loadDecisionsIndex(10);
  return formatForSystemPrompt(decisions); // string pronta para CLAUDE.md preamble
});
```

**Índice de decisões:** Daemon mantém `~/.context-keeper/index.json` com histórico global
de decisões por projeto. MCP server lê esse arquivo — zero banco de dados no MVP.

**Estrutura de arquivos:**
```
packages/mcp/
  src/
    server.ts       # setup MCP server, registra resources/tools
    context.ts      # findClaudeMd, extractManagedSection
    index.ts        # entry point (npx context-keeper mcp)
  tests/
    server.test.ts
```

---

### 4.3 Web + Billing (`apps/web`)

**Stack confirmado:** Next.js 15 (App Router) + Prisma 7 + PostgreSQL + Stripe + Auth0.

> Next.js 16 ainda não GA em 2026-06; usar Next.js 15.x estável.

**Páginas (MVP mínimo):**

| Rota | Descrição |
|---|---|
| `/` | Landing page (hero, pricing, CTA) |
| `/dashboard` | Lista de projetos e sessões capturadas (protegida) |
| `/settings` | API key Groq, configuração de projetos, auto-commit on/off |
| `/billing` | Stripe Checkout, gerenciar assinatura |
| `/api/stripe/webhook` | Webhook Stripe (ativação/cancelamento de plano) |

**Auth:** Auth0 (Next.js SDK). Usuário autenticado → dashboard. Sem autenticação → landing.

**Modelo de dados Prisma (mínimo):**
```prisma
model User {
  id        String   @id @default(cuid())
  auth0Id   String   @unique
  email     String   @unique
  plan      Plan     @default(FREE)
  stripeId  String?
  projects  Project[]
  createdAt DateTime @default(now())
}

model Project {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  name      String
  path      String     // path absoluto no disco do dev
  decisions Decision[]
}

model Decision {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  text       String
  sessionId  String   // basename do .jsonl
  capturedAt DateTime @default(now())
}

enum Plan { FREE, PERSONAL, PRO, LIFETIME }
```

**Billing Stripe:**
- Checkout Sessions (não PaymentIntents) — fluxo mais simples para subscriptions.
- Webhook `customer.subscription.updated` → atualiza `User.plan` no banco.
- Price IDs por plano no `.env`.

**Deploy:** EasyPanel (padrão ROI Labs). Dockerfile minimalista. PostgreSQL via EasyPanel service.

**Estrutura de arquivos:**
```
apps/web/
  app/
    page.tsx              # landing
    dashboard/page.tsx
    settings/page.tsx
    billing/page.tsx
    api/stripe/webhook/route.ts
  components/
    PricingTable.tsx
    DecisionsList.tsx
  lib/
    auth0.ts
    stripe.ts
    prisma.ts
```

---

## 5. Kill criterion

**D+90 = 2026-09-04:** Zero usuários pagantes = encerrar projeto.

**Milestones de go/no-go:**
| Data | Milestone | Critério |
|---|---|---|
| D+30 (2026-07-06) | Early signal | ≥ 1 usuário pagante OU ≥ 50 instalações do daemon |
| D+60 (2026-08-05) | Tração | ≥ 10 usuários pagantes |
| D+90 (2026-09-04) | Kill / Escalar | 0 pagantes = kill; ≥ 10 = escalar (multi-tool) |

---

## 6. Breakdown de tarefas de implementação (para o Lead distribuir)

### Bloco A — CORE Daemon (prioridade máxima, desbloqueia validação)

| # | Tarefa | Estimativa |
|---|---|---|
| A1 | Setup monorepo (pnpm workspaces: packages/daemon, packages/mcp, apps/web) | S |
| A2 | Implementar `watcher.ts`: chokidar + debounce 5 min | S |
| A3 | Implementar `extractor.ts`: lê JSONL + prompt Groq + parse JSON response | M |
| A4 | Implementar `merger.ts`: lê/escreve CLAUDE.md com markers, estratégia de merge | M |
| A5 | Implementar `git.ts`: commit opcional com flag `--auto-commit` | S |
| A6 | CLI entry point + `index.ts` + testes A2–A5 | M |
| A7 | Publicar `npx context-keeper` no npm (beta privado) | S |

### Bloco B — MCP Server (desbloqueia integração Claude Code)

| # | Tarefa | Estimativa |
|---|---|---|
| B1 | Setup `packages/mcp` + MCP SDK | S |
| B2 | Implementar resource `context://current` | S |
| B3 | Implementar tools `get_decisions` + `inject_context` | S |
| B4 | Índice `~/.context-keeper/index.json` (daemon escreve, MCP lê) | S |
| B5 | Testes MCP + documentação de configuração `claude_code_settings.json` | S |

### Bloco C — Web + Billing (necessário para monetização D+30)

| # | Tarefa | Estimativa |
|---|---|---|
| C1 | Setup `apps/web` Next.js 15 + Auth0 + Prisma + schema mínimo | M |
| C2 | Landing page com pricing table | M |
| C3 | Dashboard: lista projetos e decisões capturadas | M |
| C4 | Stripe Checkout + webhook + ativação de plano | M |
| C5 | Settings page (Groq key, projetos, auto-commit) | S |
| C6 | Deploy EasyPanel + CI básico | S |

**Legenda:** S = pequeno (< 4h), M = médio (4–8h).

**Ordem recomendada:** A1 → A2–A6 em paralelo → A7 + B1–B5 em paralelo → C1–C6.

---

*Documento gerado por tom (MCP Engineer) em 2026-06-06. Revisão e decomposição de tarefas pelo Lead.*
