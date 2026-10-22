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

`DATABASE_URL` em `.env` (ver `.env.example` na raiz).
