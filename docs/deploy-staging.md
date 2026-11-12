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
| `PUBLIC_UPLOAD_BASE_URL` | API no Compose — URL pública das fotos (`https://api…/uploads`; repassada em `docker-compose.yml`) |
| `KEYCLOAK_PUBLIC_HOSTNAME`, `KC_PROXY_HEADERS` | Container Keycloak — hostname público e headers `X-Forwarded-*` atrás do TLS |
| `DATABASE_URL`, `POSTGRES_*`, `KEYCLOAK_ADMIN_*` | Compose no servidor |

Modelo: copie [.env.staging.example](../.env.staging.example) → `.env` na VPS e preencha. **Nunca** commitar `.env` real.

### Keycloak — client `pelada-web` (staging)

O import local [`infra/keycloak/import/pelada-realm.json`](../infra/keycloak/import/pelada-realm.json) traz apenas **localhost** em `redirectUris` e `webOrigins`. No servidor de staging, ajuste o client no **admin do Keycloak** (ou um realm de staging separado) **antes** de testar login no browser — alinhado a [ambiente-dev-auth.md](ambiente-dev-auth.md).

Substitua `https://app.staging.seudominio.com` pela URL real do Angular:

| Campo | Valor staging |
|-------|----------------|
| Valid redirect URIs | `https://app.staging.seudominio.com/*` |
| Valid post logout redirect URIs | `https://app.staging.seudominio.com/entrar` (ou `…/*`) |
| Web origins | `https://app.staging.seudominio.com` |

O Angular define `redirectUri` = `{origem}/entrar` (`auth.config.ts`) e o `angular-oauth2-oidc` usa `redirectUri` como fallback de **post logout** quando `postLogoutRedirectUri` não está setado — o logout envia `post_logout_redirect_uri` = `…/entrar`. Cadastre essa URI (ou wildcard `/*`) em **Valid post logout redirect URIs**.

Sem **Web origins** (e CORS do IdP), o fluxo OIDC/PKCE no browser falha mesmo com redirect URIs corretas.

API: `KEYCLOAK_ISSUER` e `KEYCLOAK_JWKS_URI` no `.env` devem usar o host público do Keycloak (`https://auth…`), como em `.env.staging.example`.

## 2. Subir stack na VPS

```bash
git clone https://github.com/messiasneto74/app-pelada.git
cd app-pelada
cp .env.staging.example .env   # editar senhas e hosts
docker compose up -d --build   # = npm run stack:up
```

Reverse proxy (Caddy / Traefik / Cloudflare Tunnel) encaminha TLS e headers `X-Forwarded-Proto` / `X-Forwarded-Host`:

- `api.staging…` → `localhost:3000` (container `api`)
- `auth.staging…` → Keycloak `8080`

### Keycloak atrás do reverse proxy (HTTPS público)

Com `STAGING_KEYCLOAK_URL` / `KEYCLOAK_ISSUER` em **HTTPS** e o Keycloak ouvindo em HTTP na rede Docker, o realm precisa conhecer o **host público** e confiar nos headers do proxy — senão o documento OIDC expõe `issuer`/`authorization_endpoint` em `http://…:8080` e o Angular (`requireHttps: true` no build staging) falha no login.

No `.env` da VPS (ver [.env.staging.example](../.env.staging.example)):

| Variável | Exemplo |
|----------|---------|
| `KEYCLOAK_PUBLIC_HOSTNAME` | `auth.staging.seudominio.com` (host **sem** `https://`) |
| `KC_PROXY_HEADERS` | `xforwarded` |

O `docker-compose.yml` repassa essas variáveis ao serviço `keycloak` (`KC_HOSTNAME`, `KC_PROXY_HEADERS`). Referência: [Keycloak — hostname e reverse proxy](https://www.keycloak.org/server/hostname#_using_a_reverse_proxy).

O smoke `npm run smoke:staging` já compara o `issuer` do `.well-known/openid-configuration` com `KEYCLOAK_ISSUER` — se o hostname/proxy estiver errado, o passo Keycloak falha antes do login manual.

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
2. Validação de `PUBLIC_UPLOAD_BASE_URL` (HTTPS, sem `localhost`, quando a API é pública)
3. OpenID metadata do realm (`KEYCLOAK_ISSUER`)

Smoke manual após o passo 3 acima: login OIDC e **logout** no browser (valida redirect/post-logout `…/entrar` e web origins).

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
- [ ] Keycloak: `KEYCLOAK_PUBLIC_HOSTNAME` + `KC_PROXY_HEADERS`; client com post-logout `…/entrar`
- [ ] Login + logout OIDC no app staging (smoke manual)
