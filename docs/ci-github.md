# CI no GitHub (CI-1)

Workflows:

- [`.github/workflows/pr-tests.yml`](../.github/workflows/pr-tests.yml) — check **`test:all + R-07`**
- [`.github/workflows/review-policy.yml`](../.github/workflows/review-policy.yml) — check **`review-policy`**
- [`.github/workflows/codex-review.yml`](../.github/workflows/codex-review.yml) — check **`codex-review-policy`**

## O que você vê no PR

1. **`test:all + R-07`** — resultado objetivo da suíte de testes.
2. **`review-policy`** — aguarda os testes, dispara o agente Cursor via webhook e
   lê o parecer para o SHA atual. É o check autoritativo do veredito Cursor.

`review-policy` fica verde somente com o cabeçalho exato
`VEREDITO: APTO PARA APROVAÇÃO MANUAL`, SHA atual, issue, milestone,
`B0=0, B1=0, B2=0` e nenhuma indicação contraditória de falha ou reprovação.
Fica vermelho quando o agente reprova, ainda não revisou o SHA atual, omite
evidências, contradiz o veredito ou tenta registrar `APPROVED`.

3. **`codex-review-policy`** — segunda revisão independente via
   `openai/codex-action`, sempre a partir da política confiável da `main`, com
   Postgres de teste e validação funcional de telas quando houver frontend.
   Forks falham explicitamente.

`codex-review-policy` fica verde somente com
`## VEREDITO CODEX: APTO PARA APROVAÇÃO MANUAL`, SHA atual, issue, milestone,
campos únicos de evidência, `B0=0, B1=0, B2=0` e testes obrigatórios comprovados.
Falha fechada para skip, contradição, evidência visual ausente ou contexto inválido.

## Bloquear merge quando o check falhar (mantenedor)

Requer **admin** no repositório `messiasneto74/app-pelada`:

1. GitHub → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Marque **Require status checks to pass before merging**
4. Em **Status checks**, selecione **`test:all + R-07`**, **`review-policy`** e
   **`codex-review-policy`**
5. Marque **Require conversation resolution before merging**
6. Marque **Require branches to be up to date before merging**
7. Salve

Com a regra, o merge manual fica bloqueado até os três checks passarem e todas
as conversas serem resolvidas. Cursor e Codex continuam sem aprovar e sem merge.

## Re-run

Após corrigir, faça push. O SHA muda, então pareceres anteriores deixam de valer.
Aguarde nova revisão do Cursor (dispara `review-policy`) e nova execução Codex.

## Agentes de código (Cursor e Codex)

Antes de dizer “pronto para merge”:

1. `npm.cmd run test:all` local verde
2. Push no branch do PR
3. Confirmar **`test:all + R-07`** verde
4. Confirmar **`review-policy`** verde para o mesmo SHA
5. Confirmar **`codex-review-policy`** verde para o mesmo SHA

A automação Cursor deve usar somente o trigger Webhook. Triggers GitHub/CI do
Cursor devem permanecer removidos.

Regras: `.cursor/rules/pelada-agente-testes.mdc`, `AGENTS.md`,
[CODEX-REVISAR-PR-SETUP.md](../.github/CODEX-REVISAR-PR-SETUP.md).
