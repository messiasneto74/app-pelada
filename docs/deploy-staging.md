# Deploy staging (DEPLOY-1)

Guia para publicar **API + Postgres + Keycloak** (Docker Compose na VPS) e **build estático do Angular** apontando para URLs públicas de staging.

Arquitetura base: [deploy-opcao-a.md](deploy-opcao-a.md).

## Pré-requisitos

- VPS com Docker + Compose (≥ 4 GB RAM recomendado).
- Domínios (ou subdomínios) com HTTPS: `app`, `api`, `auth`.
- Cofre de secrets (arquivo `.env` no servidor, GitHub Environments, ou vault do provedor).

## 1. Secrets e variáveis

| Variável | Onde usar |
|----------|-----------|
| `STAGING_PELADA_API_URL` / `PELADA_API_URL` | Smoke, build web (`build:web:staging`) |
| `STAGING_KEYCLOAK_URL` / `KEYCLOAK_URL` | Smoke, build web |
| `KEYCLOAK_ISSUER` | API (validação JWT) + smoke |
| `KEYCLOAK_JWKS_URI` | API dentro do Docker (URL interna ou pública — ver F0-7) |
| `CORS_ORIGIN` | API — origem exata do Angular (`https://app…`) |
| `DATABASE_URL`, `POSTGRES_*`, `KEYCLOAK_ADMIN_*` | Compose no servidor |

Modelo: copie [.env.staging.example](../.env.staging.example) → `.env` na VPS e preencha. **Nunca** commitar `.env` real.

Keycloak: redirect URIs do client `pelada-web` = `https://app.staging.seudominio.com/*`.

## 2. Subir stack na VPS

```bash
git clone https://github.com/messiasneto74/app-pelada.git
cd app-pelada
cp .env.staging.example .env   # editar senhas e hosts
docker compose up -d --build   # = npm run stack:up
```

Reverse proxy (Caddy / Traefik / Cloudflare Tunnel) encaminha:

- `api.staging…` → `localhost:3000` (container `api`)
- `auth.staging…` → Keycloak `8080`

## 3. Build do Angular (staging)

Na máquina de build ou no CI, com as URLs públicas exportadas:

```powershell
Set-Location D:\desenvolvimento\app-futebol
$env:STAGING_PELADA_API_URL = "https://api.staging.seudominio.com"
$env:STAGING_KEYCLOAK_URL = "https://auth.staging.seudominio.com"
npm.cmd run build:web:staging
```

Saída: `apps/pelada-web/dist/pelada-web/browser/` → publicar em Cloudflare Pages, Nginx ou objeto estático.

O arquivo `environment.staging.generated.ts` é criado pelo script e está no `.gitignore`.

## 4. Smoke pós-deploy

Com `.env` carregado (ou variáveis exportadas apontando para **staging** na internet):

```powershell
npm.cmd run smoke:staging
```

Verifica:

1. `GET {API}/health`
2. OpenID metadata do realm (`KEYCLOAK_ISSUER`)

Equivalente local da stack: `npm.cmd run smoke:stack` e `npm.cmd run smoke:keycloak`.

## 5. GitHub (secrets opcionais)

Para automação futura (CI-1), reserve no repositório:

| Secret | Uso |
|--------|-----|
| `STAGING_PELADA_API_URL` | smoke / build |
| `STAGING_KEYCLOAK_URL` | smoke / build |
| `STAGING_SSH_HOST` | deploy SSH (quando existir workflow) |

Issue **DEPLOY-1** não exige pipeline de deploy automático — apenas documentação, build staging e smoke reproduzível.

## Checklist DoD (#51)

- [ ] `docker compose up` (stack) documentado e testado na máquina ou VPS
- [ ] `.env.staging.example` revisado
- [ ] `npm run build:web:staging` com URLs reais de staging
- [ ] `npm run smoke:staging` verde contra o ambiente publicado
