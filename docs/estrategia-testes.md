# Estratégia de testes — MVP Pelada

**Regra:** nada de qualidade “só no documento”. Cada item abaixo tem **issue no GitHub** para implementação. Issues de produto (`3.x`, `CORE-*`, etc.) **não fecham** sem os testes do tipo exigido nesta matriz.

## Por que testar (para quê)

| Motivo | O que protege |
|--------|----------------|
| **Sorteio e regras** | Discussão na quadra: médias, GK, 21 em 3×6, fila — erro aqui mata confiança no app. |
| **API + auth** | Vários celulares, mesmo dado: JWT, organizador vs jogador, presença e caixa não podem divergir. |
| **Regressão issue a issue** | Cada PR da issue #N entrega código **e** testes novos; CI impede merge quebrado. |
| **E2E único no fim** | Prova que Keycloak → API → Angular → fluxo da spec §1 funciona junto (não substitui testes de cada camada). |

**Não fazemos:** 88 histórias × E2E; teste manual como único critério; “testar tudo no final”.

---

## Quantos testes (meta MVP)

Números são **casos de teste automatizados** (cada `it()` / `test()`), não issues.

| Camada | Meta MVP | Issues que implementam |
|--------|----------|-------------------------|
| **Core** (`packages/core`) | **18–25** | `CORE-TEST` + cada `CORE-*` |
| **API unit** (services, validadores) | **40–60** | `TEST-API-HARNESS` + cada `*-API` |
| **API integração** (HTTP + DB teste) | **50–70** | cada `*-API` |
| **Web unit** (guards, pipes, serviços) | **15–25** | `TEST-WEB-HARNESS` + F0-6, telas críticas |
| **E2E** (Playwright) | **1 fluxo (~10–15 passos)** + **2 smoke** | `E2E-1` |
| **CI** | 1 pipeline | `CI-1` |

**Total automatizado esperado no MVP:** ~**130–180** casos (cresce com cada `*-API`).

---

## Quais testes (suites nomeadas)

### A. Core — Vitest (`packages/core`)

| Suite / arquivo | Casos (mín.) | Por quê |
|-----------------|--------------|---------|
| `partition.spec` — equilíbrio 21/3×6, 18/3×6, 14/2×5 | 4 | Formatos reais da pelada |
| `partition.spec` — modo aleatório vs equilibrado | 2 | Histórias 50–51 |
| `partition.spec` — regerar / seed | 2 | História 53 |
| `partition.spec` — swap manual recalcula score | 2 | História 54 |
| `gk.spec` — um GK por time; GK fixo fora da linha | 3 | 5–7, 56–58 |
| `constraints.spec` — validação pré-sorteio (capacidade) | 2 | Evitar sorteio inválido |
| `suggestFormat.spec` — mais/menos gente que o ideal | 3 | História 45 / `L45-CORE` |
| `rotation.spec` — 3 times, descanso, ganha fica | 3 | 63–65 |
| `metrics.spec` — score 0–100, médias | 2 | 48–49, 55 |

### B. API — Jest + Supertest + Postgres de teste

| Módulo | Casos (mín.) | Issue produto |
|--------|--------------|---------------|
| Health / erro padrão | 3 | F0-3 |
| Auth guard — JWT válido, inválido, JIT user | 4 | F0-4b |
| `GET/PATCH /me` | 3 | F0-4b |
| `POST /peladas`, organizador | 4 | L1-API |
| Rules GET/PATCH + GK exclusivo | 6 | 3.2-API |
| `rulesOverride` partida | 2 | 3.2-EXC |
| Dashboard início | 3 | 3.1-API |
| CRUD jogadores + fixo lista | 6 | 3.7-API |
| Matches create | 3 | 3.3-API |
| Presença: confirmar, fila, convidado, fechar | 8 | 3.4-API |
| Draw preview + persist + swap | 6 | 5-API |
| Sessão campo + rodízio | 5 | 3.6-API |
| Caixa / ledger | 6 | 3.9-API |

### C. Web — Vitest ou Jest (Angular)

| Área | Casos (mín.) | Issue |
|------|--------------|-------|
| `authGuard`, interceptor Bearer | 4 | F0-6, TEST-WEB-HARNESS |
| Form regras (GK mutuamente exclusivo) | 2 | 3.2 |
| Sorteio UI (chama API, exibe %) | 2 | 3.5 |

Telas só layout: **aceite manual** na issue + screenshot no PR até `E2E-1` cobrir.

### D. E2E — Playwright (`e2e/`)

| Cenário | Passos | Issue |
|---------|--------|-------|
| **Fluxo MVP** | entrar (dev ou KC) → criar pelada → regra → jogador → partida → presença → fechar → sorteio → campo | E2E-1 |
| Smoke login | 1 | E2E-1 |
| Smoke 4 abas | 1 | E2E-1 |

---

## Matriz: tipo de teste obrigatório por issue

| Tipo de issue | Fecha sem |
|---------------|-----------|
| `core` | + testes Vitest na suite A (ou ampliar) |
| `backend` (`*-API`, F0-*) | + testes integração módulo B; CI verde |
| `frontend` (tela) | harness web se lógica; senão checklist spec + screenshot |
| `devops` `CI-1` | pipeline rodando no PR |
| `qa` `E2E-1` | Playwright no staging |

---

## Definition of Done (toda issue de implementação)

1. Critérios de aceite da spec copiados na issue — todos atendidos.
2. Testes novos listados no PR (número + arquivo).
3. `npm run test:core` e `npm run test:api` verdes no CI.
4. Migrations Prisma se tocar schema.

---

## Issues de testes/CI (GitHub)

| ID | Título |
|----|--------|
| **CI-1** | GitHub Actions: install, lint, test:core, test:api |
| **TEST-API-HARNESS** | API: DB teste, factories, mock JWT, primeiro teste integração |
| **TEST-WEB-HARNESS** | Angular: runner de testes + exemplo guard/interceptor |
| **CORE-TEST** | (já existe) suites A completas |
| **E2E-1** | (já existe) Playwright fluxo MVP |

Demais issues **herdam** a obrigação da matriz acima.

---

## Anexo — blocos para colar na issue (por label)

Use **um ou mais** blocos conforme labels `core` / `backend` / `frontend` / `qa` / `devops`.

### Bloco `core`

```markdown
## Testes obrigatórios
- [ ] Casos Vitest novos em `packages/core/src/**/*.spec.ts` (ver §A — suite desta issue)
- [ ] `npm run test:core` verde
- [ ] PR lista: arquivo + quantidade de `it()`
```

### Bloco `backend`

```markdown
## Testes obrigatórios
- [ ] Integração: `apps/api/test/` ou `*.e2e-spec.ts` com Postgres teste
- [ ] Mínimo sugerido para este módulo: [N] casos (auth 401, happy path, validação, permissão organizador)
- [ ] `npm run test:api` verde
- [ ] Migration Prisma se aplicável
```

### Bloco `frontend`

```markdown
## Testes obrigatórios
- [ ] Com lógica: testes em `apps/pelada-web/src/**/*.spec.ts`
- [ ] Só UI: checklist spec §3 + screenshot mobile 390px no PR
- [ ] Rotas/guards se tocar navegação ou auth
```

### Bloco `qa`

```markdown
## Testes obrigatórios
- [ ] `e2e/mvp-flow.spec.ts` — fluxo completo §D
- [ ] Smoke: login + 4 abas
- [ ] Gravado no CI (opcional) ou rodado manual em staging antes de fechar
```

### Bloco `devops` (CI-1)

```markdown
## Testes obrigatórios
- [ ] `.github/workflows/ci.yml` roda em PR
- [ ] Falha se `test:core` ou `test:api` falhar
```

### Referência rápida — casos mínimos API por issue

| Issue | Casos integração (mín.) |
|-------|-------------------------|
| F0-3 | 3 (health, 404/erro padrão, validação) |
| F0-4b | 7 (401, JWT ok, JIT user, /me GET/PATCH) |
| L1-API | 4 |
| 3.2-API | 6 |
| 3.2-EXC | 2 |
| 3.1-API | 3 |
| 3.7-API | 6 |
| 3.3-API | 3 |
| 3.4-API | 8 |
| 5-API | 6 |
| 3.6-API | 5 |
| 3.9-API | 6 |
