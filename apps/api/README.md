# @pelada/api

NestJS + Prisma (PostgreSQL).

## Schema (F0-2 bootstrap)

- `User` — `keycloakSub`, `email`, `phone`
- `Pelada` — `name`, `ownerId`
- `PeladaMember` — papel `ORGANIZADOR` | `JOGADOR`

Modelo completo na issue **T5**.

## Comandos

Na raiz do monorepo:

```bash
npm run db:up        # Docker Postgres :5433
npm run db:migrate   # prisma migrate deploy
npm run dev:api
```

`DATABASE_URL` em `.env` na raiz (Prisma e `npm run dev:api` carregam esse arquivo).

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
