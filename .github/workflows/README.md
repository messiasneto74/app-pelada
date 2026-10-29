# GitHub Actions — app-pelada

## `pr-tests.yml` (CI-1)

| Quando | O quê |
|--------|--------|
| Todo **pull_request** para `main` | `npm run test:all:ci` (Karma `ChromeHeadless` + `CHROME_HEADLESS_FLAGS` no Linux) |
| Inclui | `test:core`, `test:api`, `test:web`, `test:scripts:r07` (Vitest + **R-07** ≥80% linhas no diff vs branch base) |

### Relação com a automação Cursor

A automação **app-pelada — revisar PR** usa as regras de revisão e publica um
parecer. O check nativo **Cursor Automation: …** informa apenas que a automação
terminou; ele pode ficar verde mesmo quando o parecer reprova o PR.

O workflow [`review-policy.yml`](./review-policy.yml) lê a review do Cursor no
SHA atual e materializa a decisão no check autoritativo **`review-policy`**.
Configure a automação com trigger **CI completed** — setup em
[CURSOR-REVISAR-PR-SETUP.md](../CURSOR-REVISAR-PR-SETUP.md).

| Situação | `test:all + R-07` | `review-policy` |
|----------|----------------------|-----------------|
| Teste ou R-07 falhou | ❌ Failed | aguarda/reprova conforme parecer |
| Agente reprovou | pode estar verde | ❌ Failed |
| Sem parecer para o SHA atual | independente | ❌ Failed |
| Testes verdes e agente declarou apto | ✅ Success | ✅ Success |

O merge fica bloqueado quando a proteção da `main` exige **os dois** checks (ver
[ci-github.md](../../docs/ci-github.md)).

### Variáveis

- `COVERAGE_BASE_REF` — passada ao `scripts/check-pr-line-coverage.mjs` (padrão local: `origin/main`).
- `CHROME_BIN` — Karma no Ubuntu.

### Local

```powershell
npm.cmd run test:all
```

Integração com Postgres de teste (`RUN_DB_TESTS=1`) **não** roda no CI por padrão (opcional depois).
