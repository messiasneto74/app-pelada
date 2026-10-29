# CI no GitHub (CI-1)

Workflows:

- [`.github/workflows/pr-tests.yml`](../.github/workflows/pr-tests.yml) — check **`test:all + R-07`**
- [`.github/workflows/review-policy.yml`](../.github/workflows/review-policy.yml) — check **`review-policy`**
- [`.github/workflows/codex-review.yml`](../.github/workflows/codex-review.yml) — check **`codex-review-policy`**

## O que você vê no PR

1. **`test:all + R-07`** — resultado objetivo da suíte de testes.
2. **`review-policy`** — aguarda os testes, dispara o Cursor via webhook e lê o parecer para o SHA atual.
3. **`codex-review-policy`** — executa a revisão independente do Codex, incluindo testes funcionais de telas quando houver frontend.

`review-policy` fica verde somente com o cabeçalho exato
`VEREDITO: APTO PARA APROVAÇÃO MANUAL`, SHA atual, issue, milestone,
`B0=0, B1=0, B2=0` e nenhuma indicação contraditória de falha ou reprovação.
Fica vermelho quando o agente reprova, ainda não revisou o SHA atual, omite
evidências, contradiz o veredito ou tenta registrar `APPROVED`.

## Bloquear merge quando o check falhar (mantenedor)

Requer **admin** no repositório `messiasneto74/app-pelada`:

1. GitHub → **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Marque **Require status checks to pass before merging**
4. Em **Status checks**, selecione **`test:all + R-07`**, **`review-policy`** e **`codex-review-policy`**
5. Marque **Require conversation resolution before merging**
6. Marque **Require branches to be up to date before merging**
7. Salve

Com a regra, o merge manual fica bloqueado até os testes passarem, os pareceres
independentes do Cursor e do Codex declararem o SHA atual apto e todas as
conversas serem resolvidas. Os agentes continuam sem aprovar e sem fazer merge.

## Re-run

Após corrigir, faça push. O SHA muda, então o parecer anterior deixa de valer.
Aguarde nova review do Cursor; ela dispara novamente o `review-policy`.

## Agentes de código (Cursor e Codex)

Antes de dizer “pronto para merge”:

1. `npm.cmd run test:all` local verde
2. Push no branch do PR
3. Confirmar **`test:all + R-07`** verde
4. Confirmar **`review-policy`** verde para o mesmo SHA
5. Confirmar **`codex-review-policy`** verde para o mesmo SHA

A automação Cursor deve usar somente o trigger Webhook. Triggers GitHub/CI devem
permanecer removidos. Os únicos vereditos autoritativos dos agentes são
**`review-policy`** e **`codex-review-policy`**; ambos precisam estar verdes.

Regras: `.cursor/rules/pelada-agente-testes.mdc`, `AGENTS.md`.
