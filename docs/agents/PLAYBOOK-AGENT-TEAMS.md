# Playbook: como operar o Agent Teams AI sem cair em loops

> Guia genérico e reutilizável, extraído do [`POSTMORTEM-deploy-loop.md`](./POSTMORTEM-deploy-loop.md) (o caso dos ~20 deploys do context-keeper).
> Premissa central, dita pelo próprio dono do projeto: **o problema raramente é a capacidade dos modelos — é o processo de operação.** Este playbook é sobre o processo.

---

## 0. O princípio que governa tudo: feche o loop de feedback ANTES de soltar os agentes

Um agente só converge num problema se consegue **verificar o próprio trabalho sem você**. A pergunta que você tem que responder antes de criar qualquer task é:

> "Quando este agente fizer uma mudança, como ele descobre — sozinho, em segundos, localmente — se funcionou?"

Se a resposta for *"ele faz deploy e olha o log"*, você já perdeu. Ele vai **debugar por deploy**: cada hipótese vira um commit + push + espera. Foi exatamente o que aconteceu no context-keeper (20 deploys, 0 builds locais).

Se a resposta for *"ele roda `docker compose build web` e lê a primeira linha vermelha"*, o loop está fechado no lugar certo (local, grátis, segundos) e o agente itera sozinho até o verde.

**Tudo neste playbook serve a esse princípio.** As seções abaixo são as ferramentas para garanti-lo.

---

## 1. O Gate Sagrado: build local antes de commit (via hook)

A regra que teria evitado o loop inteiro:

> **Nenhum commit que toca `apps/web` ou o Dockerfile entra sem o build Docker passar localmente.**

Você poderia escrever isso no papel do reviewer e torcer. Mas devs Haiku sob pressão pulam etapas, e o reviewer pode travar (aconteceu). A forma robusta é **não depender de obediência** — é um **hook** que o harness executa e o agente não tem como pular.

### Por que hook vence "regra de processo"
- A regra depende do agente lembrar e querer. O hook **executa sempre**, automaticamente.
- Exit code 2 num `PreToolUse` **nega o `git commit`** e devolve a mensagem de erro pro modelo — ele recebe o build quebrado como feedback imediato e corrige, em vez de empurrar.
- É o mesmo motivo de um pre-commit hook de Git existir: tirar a disciplina das mãos de quem tem pressa.

### Sintaxe — `PreToolUse` que bloqueia commit se o build falhar

Hooks ficam em `.claude/settings.json` (do projeto, para valer só aqui). Um hook `PreToolUse` com matcher `Bash` recebe o tool call via **stdin** (JSON com `tool_input.command`); se o comando for um `git commit`, roda o build e sai com **código 2** para abortar:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/build-gate.sh"
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/build-gate.sh`:
```bash
#!/usr/bin/env bash
# Lê o tool call do stdin; só age em 'git commit'.
input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c "import sys,json;print(json.load(sys.stdin).get('tool_input',{}).get('command',''))")

case "$cmd" in
  *"git commit"*)
    # Só roda se houver mudança em apps/web ou no Dockerfile (evita rodar à toa).
    if git diff --cached --name-only | grep -qE '^apps/web/|Dockerfile'; then
      echo "🔒 Build gate: rodando 'docker compose build web' antes do commit..." >&2
      if ! docker compose build web >/tmp/build-gate.log 2>&1; then
        echo "❌ BUILD FALHOU — commit bloqueado. Primeiras linhas:" >&2
        head -40 /tmp/build-gate.log >&2
        exit 2   # exit 2 = nega o commit e devolve o stderr ao modelo
      fi
      echo "✅ Build verde — commit liberado." >&2
    fi
    ;;
esac
exit 0
```

> Configure isso com a skill **`update-config`** (ela edita `settings.json` corretamente e valida o JSON). Não edite o settings na mão se puder evitar — BOM/encoding no Windows quebra o parse.

### ⚠️ Onde o hook realmente roda (leia isto)
O hook acima é do **harness do Claude Code**. O Agent Teams AI é **outro app, com runtime próprio** — ele pode não disparar os hooks do seu `.claude/settings.json`. Então, na prática:

- **Se você roda os agentes pelo Claude Code** (CLI/IDE): o hook funciona como descrito. ✅
- **Se você roda pelo Agent Teams AI:** trate o hook como a trava do **seu próprio ambiente** (quando você ou o Claude Code tocam o repo) e, para os agentes da ferramenta, replique a regra no **papel do reviewer + no CLAUDE.md do projeto** (seção 4) — _e_, idealmente, instale um **pre-commit hook do próprio Git** (`.git/hooks/pre-commit` ou via Husky), que é agnóstico de qual app fez o commit:

```bash
# .husky/pre-commit  (ou .git/hooks/pre-commit, chmod +x)
git diff --cached --name-only | grep -qE '^apps/web/|Dockerfile' || exit 0
docker compose build web || { echo "❌ build falhou — commit abortado"; exit 1; }
```

O pre-commit do Git é a trava mais portátil: **qualquer** commit, de qualquer agente ou app, passa por ele.

### Trade-off
O build roda a cada commit relevante (~30–90s). Mitigue: commits em **lotes maiores** (não 1 commit por linha mudada), e o gate só dispara quando o diff toca `apps/web/` ou o Dockerfile. Se ficar lento demais para o seu fluxo, caia para o **fallback**: regra forte no CLAUDE.md + reviewer obrigado a colar a saída de `docker compose build web` no PR antes de aprovar.

---

## 2. Uma task = um resultado verificável (mate o scope creep)

No caso real, a task **"Fix Prisma type error"** virou **"implementar adapter-pg + prisma.config.ts + decisão de arquitetura"** — 3× o escopo, ~50 min, cascata de novos bloqueios.

### Regras para escrever uma task
- **Cabe num único "verde".** Se concluir a task exige >1 critério de sucesso independente, são >1 tasks.
- **O critério de pronto está escrito na task**, objetivo e binário:
  - ❌ "Deixar o Prisma funcionar" (pesquisa aberta, sem fim)
  - ✅ "`npx tsc --noEmit` passa em `lib/prisma.ts`" / "`docker compose build web` chega a verde"
- **Inclui o comando de verificação** que o agente deve rodar antes de dizer "feito".
- **Se a task descobrir um problema fora do escopo**, o agente abre uma **nova task** e segue — não incha a atual.

### Sinal de alerta em tempo real
Se um agente está no mesmo item há >30 min criando arquivos novos a cada tentativa (como os `error.tsx`/`not-found.tsx`/`force-dynamic` do caso `<Html>`), **pare**. Quase sempre é sintoma de: (a) o ambiente não foi reproduzido localmente, ou (b) a task era grande demais. Não deixe o agente "tentar mais uma".

---

## 3. Antes de teorizar sobre o código, reproduza o ambiente

O erro mais caro do caso (`<Html> should not be imported`, 45+ min) **não estava no código** — era `NODE_ENV=development` no shell. Nenhuma quantidade de leitura de código acharia isso; um build no ambiente certo, sim (o erro *some* com `NODE_ENV=production`, apontando a env na hora).

Coloque isto como instrução de debugging dos agentes:
> Erro de build/deploy? **Primeiro reproduza no ambiente idêntico ao do deploy** (`docker compose build web`, que já tem `NODE_ENV: production`). Leia a **primeira** linha vermelha, não a última. Só depois forme hipóteses sobre o código.

Isto é a aplicação direta da regra global de debugging do usuário ("env vars primeiro, depois o código").

---

## 4. Contexto técnico compartilhado = `CLAUDE.md` do projeto

A causa das decisões que se contradiziam (pnpm→npm e de volta; `prisma.config.ts` duplicado) foi a **ausência de uma fonte de verdade** que todo agente lê. Cada um (e cada nova sessão) re-decidia do zero.

Crie/mantenha um `CLAUDE.md` na raiz do projeto com as **decisões travadas** — curto, imperativo, não-negociável:

```markdown
# context-keeper — regras para agentes

## Build & deploy (NÃO re-decidir)
- Package manager: **pnpm** (monorepo). NUNCA npm/yarn. Sem package-lock.json.
- Antes de QUALQUER commit em apps/web ou Dockerfile: `docker compose build web` tem que passar.
- Next.js: `output: 'standalone'` — o Dockerfile runtime DEVE usar .next/standalone.
- Prisma 7: datasource SEM `url` no schema; conexão via datasourceUrl/adapter. Um único prisma.config.ts.
- SDKs (Stripe, etc.): lazy init — nada de throw/env no top-level (quebra o build).

## Fonte de verdade dos papéis: docs/agents/AGENTS.md
```

> Liga ao [`AGENTS.md`](./AGENTS.md) (papéis detalhados) e ao [`PROMPTS-SHORT.md`](./PROMPTS-SHORT.md) (papéis coláveis na UI). O `CLAUDE.md` é o "o quê é verdade"; o `AGENTS.md` é "quem faz o quê".

---

## 5. Monte o time pelo tipo de trabalho (e não paralelize o que é sequencial)

O caso usou 5 membros (lead + 4) para um problema de deploy. **Deploy é trabalho sequencial de uma pessoa** — uma cadeia causal (corrige A → revela B → corrige B). Jogar um exército nisso só multiplica reassignments e confusão de ownership.

| Tipo de trabalho | Time recomendado |
|---|---|
| **Deploy / debugging de build** (sequencial, 1 cadeia causal) | 1 dev competente + 1 reviewer. NÃO paralelize. Idealmente o modelo mais forte que você tem, porque exige raciocínio, não volume. |
| **Implementar N features independentes** (paralelizável) | Lead + vários devs Haiku (volume) + reviewer Sonnet. Aqui o paralelismo ganha. |
| **Arquitetura / decisão de fundo** | 1 Sonnet/Opus decidindo; devs só executam depois. |
| **Review crítico (auth, pagamentos, build)** | Reviewer Sonnet High. Não economize no reviewer — é o portão. |

Regra de bolso: **paralelize tarefas independentes; serialize cadeias causais.** Se a tarefa B depende do resultado de A, dois agentes não terminam mais rápido — atrapalham-se.

---

## 6. Quando o reviewer trava: re-fatie, não contorne

No caso, o reviewer `jack` ficou preso >2h; o lead **forçou a aprovação** e, depois, criou uma **equipe nova** (`signal-ops-1`) para escapar do impasse — jogando fora todo o contexto.

Os dois movimentos são armadilhas:
- **Force-approve** = a revisão não aconteceu. O bug que ela pegaria vai pra produção.
- **Criar time novo** = recomeçar do zero, sem o contexto acumulado (o motivo nº1 de loops longos).

Protocolo correto quando algo trava (reviewer ou dev):
1. **A task é grande demais?** Re-fatie em pedaços menores e verificáveis (volta à seção 2). Tarefa menor destrava revisor.
2. **O bloqueio é técnico real?** Abra uma task focada só nele, com critério de pronto, e resolva-o antes de retomar.
3. **O runtime do agente travou?** (acontece nesta ferramenta — ver `project_agent_teams_ai.md`). Reinicie o membro/app, mas **mantenha a mesma equipe e contexto**. Não crie equipe nova como fuga.
4. Só crie equipe nova quando o **objetivo** mudar — nunca para escapar de um bloqueio.

---

## 7. Anti-padrões (a tabela de bolso)

| Anti-padrão | Como apareceu no caso | O certo |
|---|---|---|
| **Deploy como loop de build** | 20 deploys, 0 builds locais | Gate de build local (§1); feche o loop antes (§0) |
| **Scope creep silencioso** | "type error" → adapter Prisma inteiro | 1 task = 1 verde, critério escrito (§2) |
| **Teorizar sem reproduzir** | 45 min no `<Html>` que era NODE_ENV | Reproduza o ambiente, leia a 1ª linha vermelha (§3) |
| **Decidir sem fonte de verdade** | pnpm↔npm indo e voltando | CLAUDE.md com decisões travadas (§4) |
| **Paralelizar o sequencial** | 5 membros num deploy de 1 cadeia | Time pelo tipo de trabalho (§5) |
| **Force-approve / time novo pra fugir** | jack travado → aprovação forçada → signal-ops-1 | Re-fatiar, manter contexto (§6) |

---

## Checklist de 1 minuto antes de soltar uma equipe

- [ ] O agente consegue **verificar o trabalho localmente** (build/teste/lint), sem deploy? (§0)
- [ ] Existe um **gate** que impede commit com build quebrado? (§1)
- [ ] Cada task tem **critério de pronto binário** e cabe num verde? (§2)
- [ ] As instruções mandam **reproduzir o ambiente** antes de teorizar? (§3)
- [ ] Existe um **CLAUDE.md** com as decisões travadas que todo agente lê? (§4)
- [ ] O **tamanho/composição do time** bate com o tipo de trabalho (sequencial vs paralelo)? (§5)
- [ ] Você sabe o que fazer **se o reviewer travar** (re-fatiar, não contornar)? (§6)
