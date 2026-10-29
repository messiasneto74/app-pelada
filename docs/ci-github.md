# CI no GitHub (CI-1)

Workflow: [`.github/workflows/pr-tests.yml`](../.github/workflows/pr-tests.yml)  
Check no PR: **`test:all + R-07`**

## O que você vê no PR

1. Aba **Checks** — job **test:all + R-07** verde ou vermelho.
2. Automação Cursor **app-pelada — revisar PR** — comentário/review alinhado (ex. TESTES FALHANDO). Deve rodar **no SHA do PR após** o check **`test:all + R-07`**: configure trigger **CI completed** (check `test:all + R-07`) ou webhook via job homônimo no workflow — ver [.github/CURSOR-REVISAR-PR-SETUP.md](../.github/CURSOR-REVISAR-PR-SETUP.md).
3. Os dois devem concordar: se o agente reprovar, o workflow também falha após o push (ou re-run).

## Bloquear merge quando o check falhar (mantenedor)

Requer **admin** no repositório `messiasneto74/app-pelada`:

1. GitHub → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Marque **Require status checks to pass before merging**
4. Em **Status checks**, procure e selecione: **`test:all + R-07`** (aparece após o primeiro PR com o workflow verde ou falho)
5. Opcional: **Require branches to be up to date before merging**
6. Salve

**Sem essa regra**, o GitHub ainda mostra o botão **Merge** mesmo com check vermelho — só o comentário do agente avisava. **Com a regra**, merge fica **bloqueado** até **test:all + R-07** passar.

## Re-run

Na aba Checks → **Re-run all jobs** após corrigir o branch.

## Agentes de código (Cursor)

Antes de dizer “pronto para merge”:

1. `npm.cmd run test:all` local verde
2. Push no branch do PR
3. Confirmar check **test:all + R-07** verde no GitHub (não ignorar comentário TESTES FALHANDO)

Regras: `.cursor/rules/pelada-agente-testes.mdc`, `AGENTS.md`.
