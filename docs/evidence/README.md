# Evidências de aceite (PRs)

Screenshots anexados nos PRs correspondentes; paths estáveis no repo para revisão.

| Issue | Arquivo | Viewport |
|-------|---------|----------|
| #15 L1 | [l1-15-onboarding-390.png](./l1-15-onboarding-390.png) | 390×844 (DevTools / rota `/dev/criar-pelada`) |

## npm audit (baseline MVP)

O gate `npm audit --omit=dev --audit-level=high` falha no monorepo por **9 highs** em dependências de **produção** (Angular 19.x, Prisma/deepmerge-ts, Multer/Nest) — **pré-existentes**, não introduzidos por issues de UI isoladas.

**Decisão MVP (mantenedor):** aceitar baseline até issues de upgrade (`DEPLOY-1` / bump Angular) ou `npm audit fix` com breaking change revisado. PRs de feature documentam este baseline quando o audit não for alterado no escopo.
