# @pelada/api

NestJS + Prisma (PostgreSQL).

## Schema (F0-2 + T5)

- `User`, `Pelada`, `PeladaMember` — bootstrap F0-2
- `PeladaRules` — regras do grupo (GK, presença, sorteio)
- `Player` — elenco da pelada
- `Match`, `MatchAttendance` — partida e presença
- `Draw`, `DrawTeam`, `DrawTeamPlayer` — sorteio / times
- `PaymentLedger` — caixa

DTOs de validação (issues `*-API`): `src/domain/dto/`. Migration: `prisma/migrations/20251027131500_t5_domain`.

## Comandos

Na raiz do monorepo:

```bash
npm run db:up        # Docker Postgres :5433
npm run db:migrate   # prisma migrate deploy
npm run db:test:up   # Postgres de teste :5435 (TEST-API-HARNESS)
npm run db:test:migrate
npm run dev:api      # hot-reload no host

# Stack integrado (API no container — F0-7)
npm run stack:up
npm run smoke:stack
```

`DATABASE_URL` em `.env` na raiz (Prisma e `npm run dev:api` carregam esse arquivo). No compose, a API usa `postgres-app:5432` e `KEYCLOAK_JWKS_URI` interno (`http://keycloak:8080/...`); ver `apps/api/Dockerfile` e [deploy-opcao-a.md](../../docs/deploy-opcao-a.md).

## Erros HTTP (F0-3)

Respostas de erro seguem:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "...",
  "path": "/rota",
  "timestamp": "2026-10-22T12:00:00.000Z"
}
```

Validação (`class-validator`): `400` com `message` em array de strings quando há vários campos.

Rota interna `POST /_probe/validate` (corpo `{ "name": "..." }`) existe só para testes até as rotas de produto.

## Auth (F0-4b)

- **Sem** rotas `/auth/*` — login só no Keycloak (Angular F0-5).
- `GET /me` e `PATCH /me` exigem `Authorization: Bearer <access_token>`.
- JWT validado via JWKS (`KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URI`).
- Primeiro acesso cria `User` no Postgres (JIT por `sub`).
- Dev local: `DEV_AUTH_BYPASS=true` + qualquer `Bearer` (ver `.env.example`); **nunca** em produção.

## Peladas (L1-API)

- `POST /peladas` — `multipart/form-data`: campos `name`, `city`, `state`, `format` (JSON string), opcional `photo` (JPEG/PNG/WebP, até 5 MB).
- Resposta `201`: `{ id, name, city, state, photoUrl?, role: "ORGANIZADOR" }`.
- Cria `Pelada`, `PeladaMember` (ORGANIZADOR) e `PeladaRules` padrão; foto em `UPLOAD_DIR` (padrão `./uploads`) servida em `/uploads/...` (`PUBLIC_UPLOAD_BASE_URL` no `.env`).
- Arquivo grande demais: `413` (Multer `LIMIT_FILE_SIZE`).

## Regras (3.2-API)

- `GET /peladas/:peladaId/rules` — JWT; membro da pelada.
- `PATCH /peladas/:peladaId/rules` — JWT; **ORGANIZADOR**; body `PatchPeladaRulesDto` (`domain/dto/`).
- Validação GK: `extra.goalkeeperPerTeam` e `extra.fixedGoalkeeper` não podem ser true juntos; conflito com `goalkeeperMode` → `400`.

## Exceção de regras por partida (3.2-EXC)

- `GET /peladas/:peladaId/matches/:matchId/rules` — JWT; membro; resposta `{ matchId, peladaId, rulesOverride, defaultRules, effectiveRules }`.
- `PATCH /peladas/:peladaId/matches/:matchId/rules-override` — JWT; **ORGANIZADOR**; body `PatchMatchRulesOverrideDto`; persiste só em `Match.rulesOverride` (não altera `PeladaRules`).
- Mesma validação GK do patch de regras da pelada, aplicada ao merge **effective** antes de salvar.

## Dashboard Início (3.1-API)

- `GET /peladas/:peladaId/dashboard` — JWT; membro; `{ peladaId, nextMatch, rosterPlayerCount, cashMonth }`.
- `nextMatch`: próxima partida não finalizada com `scheduledAt` futuro; confirmados, capacidade (regras efetivas), avatares/nomes.
- `cashMonth`: soma `PAID` no mês UTC (`receivedCents`) e `PENDING`+`PAID` criados no mês (`expectedCents`).

## Testes de integração (TEST-API-HARNESS)

- Runner: `test/jest-integration.json` (incluído em `npm run test:api`).
- Postgres dedicado: `npm run db:test:up` + `db:test:migrate` na raiz; `DATABASE_URL_TEST` no `.env`.
- Com DB de teste: `$env:RUN_DB_TESTS="1"; npm.cmd run test:api` — health, 401, JIT com JWT RS256 de fixture (`test/helpers/sign-test-jwt.ts`).
- Factories: `test/factories/user.factory.ts`, `pelada.factory.ts`, `match.factory.ts`, `player.factory.ts`.
