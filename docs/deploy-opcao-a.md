# Deploy Opção A — VPS + Docker Compose (MVP)

Referência de arquitetura: [arquitetura-backend-frontend.md §1.2](arquitetura-backend-frontend.md#12-backend-da-aplicação-e-hospedagem).

## O que sobe no servidor

| Serviço Compose | Função |
|-----------------|--------|
| `postgres-app` | Dados da pelada (Prisma) |
| `postgres-keycloak` | Banco do Keycloak |
| `keycloak` | Login OIDC (realm `pelada`) |
| `api` | NestJS (`apps/api/Dockerfile`) |

O **Angular** não entra no compose do MVP: build estático em **Cloudflare Pages** (ou similar) apontando `apiUrl` e Keycloak para os domínios públicos.

## Domínios sugeridos

| Host | Destino |
|------|---------|
| `app.seudominio.com` | Angular (Pages) |
| `api.seudominio.com` | Reverse proxy → container `api:3000` |
| `auth.seudominio.com` | Reverse proxy → container `keycloak:8080` |

HTTPS em todos (Caddy, Traefik ou Cloudflare Tunnel). **CORS** na API: só a origem do app (`CORS_ORIGIN`).

## Variáveis (produção)

Copie [.env.example](../.env.example) como base e ajuste:

- `DATABASE_URL` — host `postgres-app` dentro do compose (não exponha Postgres na internet).
- `KEYCLOAK_ISSUER` — URL pública do realm (`https://auth.seudominio.com/realms/pelada`).
- `KEYCLOAK_JWKS_URI` — mesma origem pública (`…/protocol/openid-connect/certs`) **ou** URL interna `http://keycloak:8080/...` se o issuer do token for o host público (igual ao dev local).
- Senhas fortes em `POSTGRES_*`, `KEYCLOAK_ADMIN_PASSWORD`; `DEV_AUTH_BYPASS=false`.

Keycloak: atualize redirect URIs do client `pelada-web` para `https://app.seudominio.com/*`.

## Fluxo de deploy (resumo)

1. VPS (ex. 4 GB RAM), Docker + Compose instalados.
2. Clone do repo, `.env` na raiz, `docker compose up -d --build` (equivalente a `npm run stack:up`).
3. Reverse proxy com TLS para `api` e `keycloak`.
4. Build Angular com `environment.production.ts` (URLs de API e auth).
5. Backup diário dos volumes `pelada_pg_app` e `pelada_pg_keycloak`.

## Dev local = mesmo compose

Na máquina de desenvolvimento o mesmo `docker-compose.yml` usa portas `localhost` — ver [desenvolvimento-local.md](desenvolvimento-local.md#subir-ambiente-integrado-f0-7).

Issue **F0-7**; evolução de CI/CD na **CI-1** / **DEPLOY-1**.
