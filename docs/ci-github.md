# CI no GitHub (CI-1)

Workflows:

- [`.github/workflows/pr-tests.yml`](../.github/workflows/pr-tests.yml) — check **`test:all + R-07`**
- [`.github/workflows/review-policy.yml`](../.github/workflows/review-policy.yml) — check **`review-policy`**

## O que você vê no PR

1. **`test:all + R-07`** — resultado objetivo da suíte de testes.
2. **`Cursor Automation: app-pelada — revisar PR`** — apenas confirma que a automação terminou. Esse check **não representa aprovação** e não deve ser usado para liberar merge.
3. **`review-policy`** — lê o parecer do Cursor para o SHA atual. É o único check autoritativo para o veredito da revisão.

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
4. Em **Status checks**, selecione **`test:all + R-07`** e **`review-policy`**
5. Marque **Require conversation resolution before merging**
6. Marque **Require branches to be up to date before merging**
7. Salve

Com a regra, o merge manual fica bloqueado até os testes passarem, o parecer do
SHA atual declarar que está apto e todas as conversas serem resolvidas. O agente
continua sem aprovar e sem fazer merge.

## Re-run

Após corrigir, faça push. O SHA muda, então o parecer anterior deixa de valer.
Aguarde nova review do Cursor; ela dispara novamente o `review-policy`.

## Agentes de código (Cursor)

Antes de dizer “pronto para merge”:

1. `npm.cmd run test:all` local verde
2. Push no branch do PR
3. Confirmar **`test:all + R-07`** verde
4. Confirmar **`review-policy`** verde para o mesmo SHA

Nunca use o check nativo **Cursor Automation: …** como autorização de merge.

Regras: `.cursor/rules/pelada-agente-testes.mdc`, `AGENTS.md`.
