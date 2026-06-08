# Post-mortem: o loop de ~20 deploys que não convergiu

> Caso real: construção e deploy do `context-keeper` no EasyPanel via **Agent Teams AI** (equipes `signal-ops` e `signal-ops-1`, 2026-06-06/07).
> Este documento é o "o que aconteceu". As regras genéricas extraídas dele estão em [`PLAYBOOK-AGENT-TEAMS.md`](./PLAYBOOK-AGENT-TEAMS.md).

---

## TL;DR

A equipe de agentes fez **~20 deploys vermelhos seguidos** no EasyPanel tentando fazer o build do `apps/web` passar. Cada deploy revelava um erro novo; o agente corrigia às cegas e empurrava de novo.

**A causa-raiz não foi capacidade dos modelos. Foi processo:**
os agentes usaram **o deploy de produção como loop de compilação**. Nunca rodaram o build localmente antes de commitar — apesar de o `docker-compose.yml` já trazer o build pronto:

```yaml
# docker-compose.yml (já existia desde o commit 7e196e8)
web:
  build:
    context: .
    dockerfile: apps/web/Dockerfile
  environment:
    NODE_ENV: production
```

**Um único comando — `docker compose build web` — teria reproduzido cada uma das ~20 falhas em segundos, na máquina, de graça.** Em vez disso, cada hipótese virou um commit + push + espera do EasyPanel.

> **A lição de uma linha:** se a única forma de a equipe descobrir que falhou é o deploy, ela vai *debugar por deploy*. Feche o loop de feedback **antes** de soltar os agentes.

---

## Timeline anotada (o erro migrando em camadas de cebola)

Lendo o `git log` de baixo pra cima, dá pra ver o alvo do erro **se mover** a cada camada resolvida — sinal clássico de debugging às cegas, sem reproduzir o ambiente.

### Fase 1 — Guerra de package manager (pnpm ↔ npm)
```
f92d8b8  fix(docker): use npm instead of pnpm for web app build
6dfcc63  fix(docker): use npm instead of pnpm for web app build   (idêntico, 2x)
6c8c841  chore: add package-lock.json for reproducible npm ci builds
0cec47c  fix(docker): copy root package-lock.json and install deps from /app
d2310a9  fix(docker): install dependencies in apps/web directly
2859f93  feat: add package-lock.json for apps/web npm ci Docker builds   (+6341 linhas!)
```
O repo é um **monorepo pnpm** (`pnpm-workspace.yaml`), a CI usa `pnpm install`, mas o Dockerfile foi forçado pra `npm ci`. Isso exige um `package-lock.json` que não existia → gerado à força (commit de +6341 linhas) → que vive dessincronizando. Resultado: `next: not found` / `prisma: not found` no build.

### Fase 2 — Prisma 7 driver adapter
```
34c7435  fix: remove datasource url from schema for Prisma 7 compatibility
9010c50  feat: wire Prisma 7 adapter-pg driver adapter for self-hosted PostgreSQL
319089e  fix: update Prisma adapter config to match tom's Path A specification
aee25fa  feat: add prisma.config.ts for Prisma 7 adapter-pg driver configuration
```
Resolvido o package manager, o próximo erro vermelho era Prisma. Note `prisma.config.ts` aparecendo — e ele acabou **duplicado** no disco (`apps/web/prisma.config.ts` E `apps/web/prisma/prisma.config.ts`, conteúdo idêntico).

### Fase 3 — Prerender estático / o falso positivo `<Html>`
```
fe41bb6  fix: add force-dynamic to protected pages to prevent static generation conflicts
804f8d7  fix: add Next 15 App Router error boundary pages to resolve Docker build
fae1f64  fix: set NODE_ENV=production in Dockerfile builder stage   ← a causa real, no fim
```
Aqui está o erro mais caro do projeto (detalhado abaixo). O sintoma era `<Html> should not be imported outside of pages/_document` durante "Generating static pages". Foram criados `error.tsx`, `global-error.tsx`, `not-found.tsx` e `force-dynamic` em 3 páginas — **nada disso era o problema**. O último commit (`fae1f64`) revela a causa real: `NODE_ENV` não estava `production` no estágio de build.

> Repare: `fae1f64` ("set NODE_ENV=production in builder") é a confissão escrita de que o build estava rodando em modo dev. O `docker-compose.yml` já tinha `NODE_ENV: production` — mas como ninguém buildava pelo compose, isso nunca foi exercido.

---

## As 5 falhas de processo

### 1. Sem gate de build local → deploy cego
- **O que houve:** ~20 commits "fix(docker)"/"fix: ... Dockerfile builder stage", zero menção a rodar o build localmente em qualquer task. O `docker-compose.yml` permitia testar desde o início.
- **Evidência:** toda a Fase 1–3 acima; `docker-compose.yml:21-28`.
- **Lição:** o ciclo de feedback do agente era `commit → push → esperar EasyPanel → ler log`. Minutos por iteração, e em produção. O ciclo certo era `docker compose build web → ler 1ª linha vermelha → corrigir`. Segundos, local.

### 2. Scope creep silencioso (1 task vira um projeto)
- **O que houve:** a task **`#762fa7c5`** ("Fix Prisma type error in lib/prisma.ts") inchou para "implementar driver adapter `@prisma/adapter-pg` + `prisma.config.ts` + decisão de arquitetura Path A/B do tom". 3× o escopo original, ~50 min.
- **Evidência:** task `#762fa7c5` (signal-ops-1) + commits `9010c50`/`319089e`/`aee25fa`.
- **Lição:** uma task que não cabe num "verde" único e objetivo se transforma em pesquisa aberta. O critério de pronto tem que estar escrito na task ("o type-check de `lib/prisma.ts` passa") — não "deixar o Prisma funcionar".

### 3. O falso positivo `<Html>` — 45 min teorizando sem reproduzir
- **O que houve:** a task **`#72ae8988`** ("Fix `<Html>` import error blocking static generation") foi atacada por >45 min com hipóteses erradas: criar `error.tsx`/`not-found.tsx`/`global-error.tsx`, adicionar `force-dynamic`, mexer no `next.config.ts`, `grep` por `next/document` (0 resultados — não era importação nenhuma). A causa real era **`NODE_ENV=development` no shell/builder**, fazendo o Next carregar chunks de dev que disparam o erro.
- **Evidência:** task `#72ae8988` (owner reassigned alice → tom); commits `fe41bb6`, `804f8d7`, e a correção real em `fae1f64`.
- **Lição:** **reproduza o ambiente de build antes de teorizar sobre o código.** O erro não estava no código — estava na variável de ambiente. Rodar o build no mesmo ambiente do deploy (o compose, com `NODE_ENV: production`) teria mostrado que o erro *sumia* — apontando a env como culpada em 1 tentativa, em vez de 3 arquivos criados à toa.

### 4. Decisões sem fonte de verdade → reversão
- **O que houve:** decisões técnicas foram tomadas, "corrigidas", e o estado convergiu de volta ao quebrado. pnpm→npm (`f92d8b8`) contra a natureza pnpm do monorepo. `prisma.config.ts` duplicado. Lockfiles mistos (`apps/web/package-lock.json` num workspace pnpm).
- **Evidência:** Fase 1; arquivos duplicados/mistos no disco.
- **Lição:** sem um **CLAUDE.md de projeto** declarando "pnpm SIM, npm NÃO; Prisma 7 usa datasourceUrl; output standalone", cada agente (e cada nova sessão) re-decide do zero e contradiz a anterior. A decisão precisa morar num lugar que todo agente lê.

### 5. Reviewer travado → force-approve; e escalar criando time novo
- **O que houve:** o reviewer `jack` ficou preso em estado "review_started" por >2h sem responder a 3+ rounds de feedback; o lead **destrancou na força** ("runtime de review do @jack está travado") e aprovou. Quando a equipe `signal-ops` emperrou de vez, criou-se uma **nova equipe `signal-ops-1`** (lead Opus) — recomeçando sem o contexto acumulado.
- **Evidência:** comentários do lead nas tasks `signal-ops`; existência das duas equipes (`signal-ops` 06-06 e `signal-ops-1` 07-06).
- **Lição:** force-approve esconde o problema (a revisão não aconteceu). Criar time novo joga fora o contexto. O certo quando algo trava: **re-fatiar a tarefa em pedaços menores** e destravar a causa, não contornar o portão.

---

## O que um humano sênior teria feito (10 min, não 2 dias)

```bash
# 1. Reproduzir o ambiente EXATO do deploy, local:
docker compose build web

# 2. Ler a PRIMEIRA linha vermelha (não a última):
#    "next: not found"  → ah, o install não rodou no contexto certo

# 3. Corrigir essa uma coisa. Rebuildar:
docker compose build web
#    "<Html> should not be imported..." → mas só em static gen?
#    → testar: e se NODE_ENV=production? (já está no compose)
#    → o erro some → a causa era a env, não o código

# 4. Repetir até verde. SÓ ENTÃO commitar e deixar o EasyPanel deployar.
```

A diferença não é inteligência — é **fechar o loop de feedback no lugar mais barato (local) e ler a primeira falha, não a última.** Os agentes são perfeitamente capazes disso; faltou o processo que os obriga a fazê-lo.

---

## Sintomas que ficaram no disco (resíduo do loop)

Não são a doença, são marcas dela — vale limpar quando for arrumar o deploy de fato:
- `apps/web/prisma.config.ts` **e** `apps/web/prisma/prisma.config.ts` — duplicados, idênticos.
- `apps/web/package-lock.json` (191 bytes / depois 6341 linhas) coexistindo com o monorepo pnpm.
- Dockerfile ainda em `npm ci` e **sem usar** `output: 'standalone'` (apesar do `next.config.ts` pedir).
- `error.tsx`/`not-found.tsx`/`force-dynamic` criados para um problema que era de env var — podem ser legítimos por outras razões, mas entraram pelo motivo errado.

→ O fix técnico correto (pnpm no Dockerfile, standalone, lazy SDK init) está descrito em [`AGENTS.md` § Anti-Deploy-Fail](./AGENTS.md#anti-deploy-fail). Mas o fix **de processo** é o que impede o próximo loop — e está no playbook.
