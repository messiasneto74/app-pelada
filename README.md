# App Pelada (monorepo)

Organização de peladas: presença, sorteio, em campo, caixa. Stack em produção no repositório: **Angular** (`apps/pelada-web`), **NestJS + Prisma** (`apps/api`), motor de sorteio **`packages/core`**, **Capacitor** (`apps/pelada-mobile`).

Referência visual e fluxos: [protótipo Resenha](prototipo/README.md) · [UI Resenha](docs/ui-referencia-resenha.md).

## Começar (desenvolvimento)

**Requisitos:** Node **22+**, npm, Docker Desktop (Postgres + Keycloak local). No Windows use `npm.cmd` se o PowerShell bloquear scripts.

```powershell
git clone https://github.com/messiasneto74/app-pelada.git
Set-Location app-pelada
Copy-Item .env.example .env
npm.cmd install
```

1. **Banco:** `npm.cmd run db:up` e `npm.cmd run db:migrate`
2. **Stack completa (recomendado auth):** `npm.cmd run stack:up` — API, Postgres, Keycloak ([Opção A](docs/deploy-opcao-a.md))
3. **Só API + web em dev:**
   - `npm.cmd run dev:api` → http://localhost:3000/health
   - `npm.cmd run dev:web` → http://localhost:4200

Guia detalhado, troubleshooting e E2E: **[docs/desenvolvimento-local.md](docs/desenvolvimento-local.md)**.

### Variáveis de ambiente

| Arquivo | Uso |
|---------|-----|
| [.env.example](.env.example) | Dev local — copiar para `.env` na **raiz** (nunca commitar `.env`) |
| [.env.staging.example](.env.staging.example) | VPS / staging ([DEPLOY-1](docs/deploy-staging.md)) |

URLs OIDC, Postgres, upload e harness de teste estão documentadas nos comentários do `.env.example`. Keycloak dev: [docs/ambiente-dev-auth.md](docs/ambiente-dev-auth.md) · credenciais: [docs/credenciais-dev-local.md](docs/credenciais-dev-local.md).

## Estrutura

```text
apps/pelada-web/     Angular 19
apps/api/            NestJS 11 + Prisma
apps/pelada-mobile/  Capacitor 7 (lojas)
packages/core/       Sorteio (Vitest)
scripts/             Smoke, E2E, CI helpers
docs/                Arquitetura, plano de issues, deploy
prototipo/           HTML/JS referência (não é produção)
```

Mais: [apps/README.md](apps/README.md) · [AGENTS.md](AGENTS.md) (agentes Cursor).

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm.cmd run test:all` | Gate local (core + api + web + scripts R-07) |
| `npm.cmd run stack:up` | Docker: Postgres ×2, Keycloak, API |
| `npm.cmd run build:web:staging` | Build Angular com URLs staging |
| `npm.cmd run build:mobile` | Web produção + `cap sync` |
| `npm.cmd run test:e2e` | Playwright (stack + dev:web) |
| `npm.cmd run smoke:stack` | Health API + OIDC local |

Lista completa em [AGENTS.md](AGENTS.md) e [desenvolvimento-local.md](docs/desenvolvimento-local.md).

## Testes e qualidade

Processo oficial: [docs/processo-testes-e-qualidade.md](docs/processo-testes-e-qualidade.md) · [docs/estrategia-testes.md](docs/estrategia-testes.md).

Antes de abrir PR: `npm.cmd run test:all` (mesmo critério do GitHub **`test:all + R-07`**).

## Documentação do produto

- [Plano de issues / milestones](docs/plano-issues-fases-milestones.md)
- [Arquitetura backend + frontend](docs/arquitetura-backend-frontend.md)
- [Deploy staging](docs/deploy-staging.md) · [Lojas (Play / App Store)](docs/publicacao-lojas-play-app-store.md)
- [Histórias de usuário](historias-de-usuarios.md) · [Telas MVP](App%20de%20Pelada%20—%20Especificação%20das%20telas%20do%20MVP.md)

## Protótipo Resenha

Dados só no navegador, sem backend. [Rodar e galeria](prototipo/visual/README.md). O Angular replica layout e tokens (issue **T1**+).
