# AGENTS.md — app-pelada (monorepo)

Instruções para **Cursor Cloud Agents**, **Automations** e qualquer agente trabalhando neste repositório (`messiasneto74/app-pelada`).

## Visão geral

App de pelada (organização de partidas, presença, sorteio). Monorepo npm:

| Pacote | Caminho | Stack |
|--------|---------|--------|
| Web | `apps/pelada-web` | Angular 19 |
| API | `apps/api` | NestJS 11 + Prisma + PostgreSQL |
| Core | `packages/core` | TypeScript + Vitest (motor de sorteio) |
| Protótipo | `prototipo/` | HTML/JS referência UI Resenha (não é produção) |

Issues e ordem de implementação: `docs/plano-issues-fases-milestones.md` e `scripts/github-issues.json`. **Não pule issues** sem alinhamento com o mantenedor.

## Comandos (raiz do repo)

```bash
npm install
npm run test:core
npm run test:api
npm run test:web
npm run dev:api    # :3000
npm run dev:web    # :4200
npm run db:up      # Docker Postgres :5433
npm run db:migrate
npm run keycloak:up
npm run smoke:keycloak
```

No Windows PowerShell, use `npm.cmd` se scripts estiverem bloqueados.

## Testes e Definition of Done

- Processo oficial: `docs/processo-testes-e-qualidade.md`
- Estratégia por módulo: `docs/estrategia-testes.md`
- Dev local: `docs/desenvolvimento-local.md`

**Antes de considerar um PR pronto:** rodar os `test:*` relevantes ao escopo da issue; o humano valida antes do merge (CI `CI-1` ainda não é obrigatório).

## Revisão de PR (agente revisor)

Ao revisar um pull request:

1. Ler título/descrição e qual issue fecha (ex. `F0-3`).
2. Conferir escopo mínimo — evitar refatorações não pedidas.
3. Verificar testes novos/atualizados e citar comandos no PR.
4. Backend: migrations Prisma se `schema.prisma` mudou; erros HTTP no formato F0-3 (`statusCode`, `error`, `message`, `path`, `timestamp`).
5. Segurança: sem secrets no git; auth JWT só nas issues F0-4+; ver `docs/escopo-seguranca-fora-mvp.md`.
6. Comentar no PR com resumo (ok / ajustes necessários) e checklist DoD.

Regras persistentes em `.cursor/rules/`.

## Cursor Cloud specific instructions

Cloud Agents **não** têm Docker do usuário nem Keycloak local por padrão.

- Copiar `.env.example` → `.env` na raiz se precisar rodar a API; `DATABASE_URL` deve usar a mesma senha que `POSTGRES_APP_PASSWORD` na primeira subida do Postgres.
- Sem Postgres: API sobe; `/health` pode retornar `database: "down"` — aceitável para revisar código que não exige DB.
- Com Postgres (se o ambiente cloud tiver Docker): `npm run db:up && npm run db:migrate`.
- **Branch alvo de PRs:** `main`.
- **Não** fazer merge, push em `main`, nem fechar issues sem pedido explícito do mantenedor.

## Documentação útil

- Arquitetura: `docs/arquitetura-backend-frontend.md`
- Auth dev: `docs/ambiente-dev-auth.md`
- UI Resenha: `docs/ui-referencia-resenha.md`
- Estado do repo: `docs/estado-do-repositorio.md`
