# Handoff — Context Keeper

Última atualização: 2026-07-12

## Feito (12/07 — "Publicar 1 artigo novo no blog", agenda do Hub)

- **Post novo** (`0b704ed`): `/blog/claude-code-skills-explained` — SKILL.md, progressive disclosure,
  skill vs slash command vs subagent vs hook vs MCP, e skill vs CLAUDE.md. Fecha o único buraco do
  cluster Claude Code (hooks, MCP, slash commands e subagents já existiam; skills não) e puxa pro
  produto pela ponta honesta: skill = *como fazer a tarefa*, não *o que o time decidiu e por quê*.
  Verificado em prod: 200, no índice do /blog e no sitemap.
- **Terminologia errada corrigida no post de slash commands**: ele chamava comandos customizados de
  "skills" e os colocava em `.claude/commands/` — anterior às skills de verdade
  (`.claude/skills/<nome>/SKILL.md`, invocadas pelo modelo). Renomeado, a keyword canibalizada
  ("claude code skills") migrou pro post novo, e os dois se cross-linkam.
- **2 `relatedSlugs` mortos** (`ai-readable-documentation`, `ai-agent-guardrails` — posts que nunca
  existiram) apontados pros slugs reais.
- Gate: `tsc` limpo + script ad-hoc validando frontmatter, relatedSlugs, links internos e compilação
  MDX dos 61 posts. Build gate do Docker (pre-commit) passou verde.

## ⚠️ O que NÃO adianta enquanto o crawl estiver travado

A revisão de kill-gates (11/07, `nimblabs/docs/killgate-review-2026-07-11.md`) mostrou que o CK tem
**0 impressões desde sempre** e o URL Inspection responde "URL is unknown to Google" — o Google
**nunca crawleou nada** do subdomínio. Sitemap OK, site 200, hub linkando. É autoridade zero em
subdomínio novo. **Publicar artigo não move esse ponteiro.** O gate D+90 (10/09) falharia por
não-indexação, não por demanda.

Ações que destravam (nenhuma é "investimento no produto", então a tese de investimento zero segue):

1. **Request Indexing no GSC UI** — home, `/blog` e 2–3 posts fortes. Manual, só o Jean faz.
2. **Backlink real do npm** — `packages/daemon/README.md` já linka `context.nimblabs.com`;
   `packages/mcp/README.md` **não linka**. Adicionar exige `npm publish` pra aparecer no npmjs.com.
3. Cross-link no rodapé dos outros 2 bets do portfólio.
