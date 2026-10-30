# GitHub Actions — app-pelada

## `pr-tests.yml` (CI-1)

| Quando | O quê |
|--------|--------|
| Todo **pull_request** para `main` | `npm run test:all:ci` (Karma `ChromeHeadless` + `CHROME_HEADLESS_FLAGS` no Linux) |
| Inclui | `test:core`, `test:api`, `test:web`, `test:scripts:r07` (Vitest + **R-07** ≥80% linhas no diff vs branch base) |

### Relação com a automação Cursor

A automação **app-pelada — revisar PR** usa as mesmas regras (R-01…R-07). Ela comenta no PR (ex.: **TESTES FALHANDO**); o workflow **materializa o veredito de testes** como check vermelho no GitHub.

**Disparo junto com este workflow:** após o job `test:all + R-07`, o job **`Cursor Automation — revisar PR`** envia webhook (se configurado) ou use trigger **CI completed** na automação — setup em [CURSOR-REVISAR-PR-SETUP.md](./CURSOR-REVISAR-PR-SETUP.md).

| Situação | Comentário do agente | Check **test:all + R-07** |
|----------|----------------------|---------------------------|
| Jest/Vitest/Karma falhou | TESTES FALHANDO | ❌ Failed |
| 0 falhas, R-07 &lt; 80% | TESTES FALHANDO | ❌ Failed |
| Tudo verde | Aprovado / OK | ✅ Success |

**Merge bloqueado** só se o mantenedor ativar *branch protection* exigindo este check (ver [ci-github.md](../../docs/ci-github.md)).

### Relação com o agente Codex

O workflow [`codex-review.yml`](./codex-review.yml) executa uma segunda revisão
independente usando a action oficial `openai/codex-action`. O mesmo job publica o
parecer e aplica o veredito ao check **`codex-review-policy`**, evitando um verde
operacional separado. Para frontend, o verde exige validação funcional da tela,
viewport 390×844 e evidência visual. Configuração em
[CODEX-REVISAR-PR-SETUP.md](../CODEX-REVISAR-PR-SETUP.md).

Esse gate usa `pull_request_target`: política e instruções vêm da `main`; o PR é
checado separadamente em `pr/`. Fork, contexto inválido, campo duplicado, teste
condicional pulado ou evidência declarada sem arquivo mantêm o check vermelho.

### Variáveis

- `COVERAGE_BASE_REF` — passada ao `scripts/check-pr-line-coverage.mjs` (padrão local: `origin/main`).
- `CHROME_BIN` — Karma no Ubuntu.

### Local

```powershell
npm.cmd run test:all
```

O gate Codex provisiona Postgres de teste e executa as suítes condicionais com
`RUN_DB_TESTS=1`; skips em runtime são bloqueantes.
