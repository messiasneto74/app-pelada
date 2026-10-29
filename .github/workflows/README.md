# GitHub Actions — app-pelada

## `pr-tests.yml` (CI-1)

| Quando | O quê |
|--------|--------|
| Todo **pull_request** para `main` | `npm run test:all:ci` (Karma `ChromeHeadless` + `CHROME_HEADLESS_FLAGS` no Linux) |
| Inclui | `test:core`, `test:api`, `test:web`, `test:scripts:r07` (Vitest + **R-07** ≥80% linhas no diff vs branch base) |

### Relação com o agente Cursor

O workflow aciona o agente Cursor por webhook para revisar o SHA atual. A
automação usa somente o trigger Webhook, evitando o check operacional verde dos
triggers GitHub do Cursor.

O workflow [`review-policy.yml`](./review-policy.yml) lê a review do Cursor no
SHA atual e materializa a decisão no check autoritativo **`review-policy`**.
O procedimento de configuração está em
[CURSOR-REVISAR-PR-SETUP.md](../CURSOR-REVISAR-PR-SETUP.md).

| Situação | `test:all + R-07` | `review-policy` | `codex-review-policy` |
|----------|----------------------|-----------------|-----------------------|
| Teste ou R-07 falhou | ❌ Failed | aguarda/reprova | reprova ao testar |
| Cursor reprovou | pode estar verde | ❌ Failed | independente |
| Codex reprovou | pode estar verde | independente | ❌ Failed |
| Parecer ausente/inválido | independente | ❌ Failed | ❌ Failed |
| Tudo verde e ambos aptos | ✅ Success | ✅ Success | ✅ Success |

O merge fica bloqueado quando a proteção da `main` exige **os três** checks (ver
[ci-github.md](../../docs/ci-github.md)).

### Relação com o agente Codex

O workflow [`codex-review.yml`](./codex-review.yml) executa uma segunda revisão
independente usando a action oficial `openai/codex-action`. O mesmo job publica o
parecer e aplica o veredito ao check **`codex-review-policy`**, evitando um verde
operacional separado. Para frontend, o verde exige validação funcional da tela,
viewport 390×844 e evidência visual. Configuração em
[CODEX-REVISAR-PR-SETUP.md](../CODEX-REVISAR-PR-SETUP.md).

### Variáveis

- `COVERAGE_BASE_REF` — passada ao `scripts/check-pr-line-coverage.mjs` (padrão local: `origin/main`).
- `CHROME_BIN` — Karma no Ubuntu.

### Local

```powershell
npm.cmd run test:all
```

Integração com Postgres de teste (`RUN_DB_TESTS=1`) **não** roda no CI por padrão (opcional depois).
