# GitHub Actions — app-pelada

## `pr-tests.yml` (CI-1)

| Quando | O quê |
|--------|--------|
| Todo **pull_request** para `main` | `npm run test:all` |
| Inclui | `test:core`, `test:api`, `test:web`, `test:scripts:r07` (Vitest + **R-07** ≥80% linhas no diff vs branch base) |

### Relação com a automação Cursor

A automação **app-pelada — revisar PR** usa as mesmas regras (R-01…R-07). Ela comenta no PR (ex.: **TESTES FALHANDO**); o workflow **materializa o veredito** como check vermelho no GitHub.

| Situação | Comentário do agente | Check **test:all + R-07** |
|----------|----------------------|---------------------------|
| Jest/Vitest/Karma falhou | TESTES FALHANDO | ❌ Failed |
| 0 falhas, R-07 &lt; 80% | TESTES FALHANDO | ❌ Failed |
| Tudo verde | Aprovado / OK | ✅ Success |

**Merge bloqueado** só se o mantenedor ativar *branch protection* exigindo este check (ver [ci-github.md](../../docs/ci-github.md)).

### Variáveis

- `COVERAGE_BASE_REF` — passada ao `scripts/check-pr-line-coverage.mjs` (padrão local: `origin/main`).
- `CHROME_BIN` — Karma no Ubuntu.

### Local

```powershell
npm.cmd run test:all
```

Integração com Postgres de teste (`RUN_DB_TESTS=1`) **não** roda no CI por padrão (opcional depois).
