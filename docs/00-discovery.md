# Context Keeper — Discovery & Validação

> Nome de trabalho. Micro-SaaS para resolver **"context rot"** em AI coding agents.
> Documento de descoberta — consolida a pesquisa de sinal real (skill `last30days`) e as
> decisões de brainstorming até aqui. **Ainda NÃO é spec de implementação.**

**Data:** 2026-06-05
**Status:** Brainstorming (pré-spec)
**Origem:** caça aberta de dores via `last30days-researcher` → dor #1 escolhida (maior sinal da varredura)

---

## 1. A dor (em uma frase)

Desenvolvedores que usam AI coding agents perdem todo o **estado de raciocínio e as decisões
de arquitetura** de uma sessão quando o contexto se degrada (*"context rot"*) ou a sessão fecha —
e reconstruir esse contexto manualmente é o maior gargalo do workflow de "vibe coding".

> *"AI can do more and more things, but no one has told it what rules to follow while doing them."*
> — issue [AI Coding Tools Are Missing a Structural Layer](https://github.com/deepseek-ai/DeepSeek-Coder/issues/703)

> *"Auto-compacting just obliterates important context"* / *"forgetting which skills were being used mid-session"*
> — r/ClaudeAI

---

## 2. Evidência de sinal (últimos 30 dias)

Fontes: Reddit, Hacker News, GitHub (via skill `last30days`, fontes grátis). X/YouTube/TikTok
ficaram de fora por falta de credencial — sinal de X é o maior gap conhecido.

| Sinal | Métrica | Fonte |
|---|---|---|
| Thread George Hotz "AI agents viram lixo após 75%" | 3.612 upvotes, 329 comentários | [r/webdev](https://www.reddit.com/r/webdev/comments/1tvsfgj/im_calling_it_now_the_adoption_of_ai_agents_into/) |
| "What is a constant pain with AI when coding?" | thread de dor ativa | [r/webdev](https://www.reddit.com/r/webdev/comments/1txkjj2/what_is_a_constant_pain_with_ai_that_you/) |
| Issue "Missing structural/process layer" | resposta valida o gap | [DeepSeek-Coder #703](https://github.com/deepseek-ai/DeepSeek-Coder/issues/703) |
| "AI Agent Guidelines CS336 Stanford" (CLAUDE.md público) | 501 pts, 153 comentários (top HN do período) | [GitHub](https://github.com/stanford-cs336/assignment1-basics/blob/main/CLAUDE.md) |
| "Landscape of second brain / memory solutions" | devs mapeando o espaço à mão | r/cursor |

**Vocabulário convergiu:** o problema agora tem nome — **"context rot"** ([MindStudio](https://www.mindstudio.ai/blog/context-rot-ai-coding-agents-explained)).

---

## 3. Concorrência e o GAP

| Ferramenta | O que resolve | O que NÃO resolve |
|---|---|---|
| [Cline Memory Bank](https://docs.cline.bot/best-practices/memory-bank) | Persistência estruturada via markdown entre sessões | Captura **automática** de decisões; não sincroniza entre ferramentas |
| CLAUDE.md / AGENTS.md | Regras de projeto e identidade do agente | Não captura estado **evoluído** da sessão; escrito à mão |
| [Mem0](https://mem0.ai/blog/state-of-ai-agent-memory-2026) / agentmemory | Memória semântica multi-scope (vector DB) | Foco enterprise/LangChain; não integrado nativamente ao fluxo de coding |
| [Hmem v2](https://news.ycombinator.com/item?id=47208019) | Hierarquia de memória eficiente em tokens | Novo, pouca tração; não faz captura automática |
| Verytis | Shared error memory via MCP | Só erros, não decisões de arquitetura |
| repomix | Serializa codebase para contexto | Snapshot estático; não preserva histórico decisional |

**GAP real (nenhum fecha o ciclo completo):**
1. **Capturar** decisões arquiteturais automaticamente durante a sessão
2. **Comprimir / priorizar** inteligentemente ao fim da sessão
3. **Injetar** contexto relevante no boot do próximo agente
4. **Agnóstico de ferramenta** via MCP (Claude Code, Cursor, Cline, Windsurf com uma implementação)

---

## 4. Mercado & disposição a pagar

- Devs pesados de Claude Code gastam **$500–2.000/mês** em API. Gestão ruim de contexto é o
  principal driver de custo variável → dá pra cobrar sobre o **delta economizado**.
- Times pagam $100–200/dev/mês por Cursor/Claude sem hesitar quando o ROI é claro (~30% mais story points).
- Audiência: r/ClaudeAI 800k+ membros, r/cursor 200k+ — ativos, alta proporção de pagantes.
- Pricing análogo ao **Compass**: $19–49/mês ou lifetime early-bird; teams $20–50/dev/mês.

---

## 5. Decisões de brainstorming (até aqui)

### ✅ Forma do produto
Não é "mais uma memory tool genérica" (espaço saturando). É um **Context Lifecycle Manager
específico para coding agents**, com três pilares que nenhum concorrente tem juntos:
1. **Captura passiva** — extrai decisões arquiteturais sem o dev escrever nada.
2. **CLAUDE.md / AGENTS.md auto-atualizado** — compacta o estado e faz commit ao fim da sessão.
3. **Multi-tool sync via MCP** — um único context layer serve Claude Code, Cursor, Windsurf, Cline.

### ✅ Mecanismo de captura: **Opção C — Extração por LLM do transcript**
Escolhida (a mais "passiva"). Lê o log/transcript da sessão e usa LLM (Groq) para extrair
decisões automaticamente, sem o dev chamar nenhuma tool.

### ✅ Alvo de público
**Vibe coders** que querem autonomia — NÃO o dev sênior que prefere controle manual.
> ⚠️ Existe backlash ativo de devs experientes ("erosion of system understanding"). O produto
> deve ser explicitamente para quem abraça o fluxo de agentes, não contra eles.

---

## 6. Questões em aberto (a resolver antes do spec)

1. **Acesso ao transcript (crítico p/ Opção C):** Claude Code guarda sessões em
   `~/.claude/projects/.../*.jsonl` (acessível — base do Compass). Cursor/Windsurf usam formatos
   próprios menos acessíveis. → Provável **Claude Code-first**, expandir depois. Confirmar escopo do MVP.
2. **Gatilho de extração:** quando rodar? (fim de sessão via hook? polling do daemon? comando?)
3. **Onde a extração roda:** daemon local (padrão Compass) vs. serviço? Custo de tokens Groq por sessão.
4. **Formato de saída:** atualiza o `CLAUDE.md` existente do projeto? cria arquivo separado? como evitar conflito com edições manuais do dev?
5. **MCP:** server que injeta contexto no boot — quais resources/tools expõe?
6. **Pricing concreto** e critério de kill (padrão Compass: D+90).

---

## 7. Stack provável (a confirmar no spec)

Padrão ROI Labs / Compass: daemon (Go ou Node) lendo `~/.claude` + Next.js 16 + Prisma 7 +
Stripe + Groq (extração) + deploy EasyPanel. MCP server como ponto de integração.

---

## Apêndice — fontes brutas da pesquisa

- `~/Documents/Last30Days/manual-tasks-automation-gap-developer-tools-wish-existed-raw-v3b.md` (caça aberta)
- `~/Documents/Last30Days/ai-coding-agent-context-loss-session-state-architecture-decisions-vibe-coding-raw-v3.md` (validação profunda)
