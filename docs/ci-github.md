# CI no GitHub (CI-1)

Workflows:

- [`.github/workflows/pr-tests.yml`](../.github/workflows/pr-tests.yml) — check **`test:all + R-07`**
- [`.github/workflows/codex-review.yml`](../.github/workflows/codex-review.yml) — check **`codex-review-policy`**

## O que você vê no PR

1. **`test:all + R-07`** — resultado objetivo da suíte de testes.
2. **`codex-review-policy`** — executa a revisão independente do Codex a partir
   da política confiável da `main`, com Postgres de teste e testes funcionais de
   telas quando houver frontend. Forks falham explicitamente.
3. Automação Cursor **app-pelada — revisar PR** — parecer independente, sem poder de aprovar ou fazer merge.

## Bloquear merge quando o check falhar (mantenedor)

Requer **admin** no repositório `messiasneto74/app-pelada`:

1. GitHub → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Marque **Require status checks to pass before merging**
4. Em **Status checks**, selecione **`test:all + R-07`** e **`codex-review-policy`**
5. Marque **Require conversation resolution before merging**
6. Marque **Require branches to be up to date before merging**
7. Salve

Com a regra, o merge manual fica bloqueado até os testes e o parecer funcional
do Codex passarem e todas as conversas serem resolvidas. Cursor e Codex
continuam sem aprovar e sem fazer merge.

## Re-run

Na aba Checks → **Re-run all jobs** após corrigir o branch.

## Agentes de código (Cursor e Codex)

Antes de dizer “pronto para merge”:

1. `npm.cmd run test:all` local verde
2. Push no branch do PR
3. Confirmar **`test:all + R-07`** verde
4. Confirmar **`codex-review-policy`** verde para o mesmo SHA
5. Confirmar que a revisão Cursor não possui bloqueantes

Quando a issue #82 estiver na `main`, adicione também **`review-policy`** aos
checks obrigatórios.

Regras: `.cursor/rules/pelada-agente-testes.mdc`, `AGENTS.md`.
