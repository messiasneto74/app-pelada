# Ambiente local — URLs, Keycloak e Angular (pré F0-1 / F0-4)

Contrato de portas e OIDC para **dev na sua máquina**. Produção troca hosts por `https://app.`, `https://api.`, `https://auth.` (mesmos nomes de realm e client).

Copie [.env.example](../.env.example) para `.env` na raiz quando o Docker Compose existir (**F0-7**).

---

## Mapa de serviços (dev)

| Serviço | URL | Porta | Issue |
|---------|-----|-------|--------|
| Angular (`ng serve`) | http://localhost:4200 | 4200 | F0-1, F0-5 |
| API Nest | http://localhost:3000 | 3000 | F0-1, F0-3 |
| Health | http://localhost:3000/health | — | F0-3 |
| Keycloak | http://localhost:8080 | 8080 | F0-4 |
| Realm | http://localhost:8080/realms/pelada | — | F0-4 |
| Postgres **app** | `localhost:5433` | 5433 | F0-2, F0-7 |
| Postgres **Keycloak** | `localhost:5434` (interno ao compose) | 5434 | F0-7 |
| Protótipo Resenha (referência) | http://127.0.0.1:8000 | 8000 | — (sem auth) |

**Dois bancos:** dados da pelada **nunca** no Postgres do Keycloak.

---

## Client Keycloak `pelada-web` (configurar na F0-4)

| Campo | Valor dev |
|-------|-----------|
| Client type | OpenID Connect |
| Client ID | `pelada-web` |
| Client authentication | **OFF** (público + PKCE) |
| Standard flow | ON |
| Direct access grants | OFF (não usar senha direto na API) |
| Valid redirect URIs | `http://localhost:4200/*` |
| Valid post logout redirect URIs | `http://localhost:4200/` |
| Web origins | `http://localhost:4200` |
| PKCE | S256 (obrigatório para client público) |

### Endpoints OIDC usados pelo Angular

| Uso | URL |
|-----|-----|
| Authorization | `{KEYCLOAK_URL}/realms/pelada/protocol/openid-connect/auth` |
| Token | `.../protocol/openid-connect/token` |
| Logout | `.../protocol/openid-connect/logout` |
| UserInfo (opcional) | `.../protocol/openid-connect/userinfo` |
| JWKS (API) | `.../protocol/openid-connect/certs` |

Variáveis em `.env.example`: `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URI`.

### Google (IdP)

O realm importado (**F0-4**) traz o provider **Google** **desligado** (`enabled: false`). Para testar:

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client (Web).
2. Redirect autorizado: `http://localhost:8080/realms/pelada/broker/google/endpoint`
3. Admin Keycloak → Realm **pelada** → Identity providers → **Google** → colar Client ID/Secret → **Save** → **Enable**.

Redirect do Google aponta para o Keycloak, não para o Angular.

---

## Fluxo no app (F0-5 / F0-6)

```mermaid
sequenceDiagram
  participant U as Usuário
  participant W as Angular :4200
  participant K as Keycloak :8080
  participant A as API :3000

  U->>W: Abre /entrar
  W->>K: Redirect authorize + PKCE
  K->>U: Login Google ou e-mail
  K->>W: Redirect com code
  W->>K: Troca code por tokens
  W->>A: GET /users/me Bearer access_token
  A->>K: Valida JWT (JWKS)
  A->>A: JIT User por sub
  A-->>W: Perfil app (telefone, pelada ativa)
```

1. **Angular** guarda `access_token` (memória + storage seguro conforme lib; refresh com `refresh_token` se configurado).
2. **Interceptor** adiciona `Authorization: Bearer …` em chamadas à API.
3. **API** não lê cookie de sessão própria para login — só JWT Keycloak.
4. Sem telefone → `/entrar/completar` → `PATCH /users/me` (ou `/me` conforme implementação F0-4b).

### Rotas Angular (auth)

| Rota | Guard |
|------|--------|
| `/entrar` | Público; inicia OIDC |
| `/entrar/completar` | `authGuard` + falta telefone |
| `/inicio`, `/partida/*`, … | `authGuard` |
| Regras, fechar lista, sortear, caixa adm | `organizadorGuard` |

---

## Variáveis no Angular (após F0-1)

Em `apps/pelada-web`, usar `environment.ts` (ou `import.meta.env`) espelhando a raiz:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'pelada',
    clientId: 'pelada-web',
  },
};
```

Biblioteca sugerida: `angular-oauth2-oidc` (PKCE) ou `keycloak-angular`.

---

## Modo dev sem Keycloak (temporário)

Até F0-4/5 prontos, a issue **F0-5** pode incluir botão “dev login” **somente** se `DEV_AUTH_BYPASS=true` no `.env` da API — a API aceita header fixo ou sub de teste. **Desligado** em staging/produção.

---

## Staging / produção (referência)

| Dev | Produção |
|-----|----------|
| http://localhost:4200 | https://app.seudominio.com |
| http://localhost:3000 | https://api.seudominio.com |
| http://localhost:8080 | https://auth.seudominio.com |

Cadastrar **as três URLs de produção** no client Keycloak (redirect, logout, web origins). Capacitor (**STORE-1**): incluir scheme/deep link acordado no mesmo client.

---

## Subir Keycloak local (F0-4)

Na raiz do monorepo (`.env` alinhado com `.env.example`):

```powershell
npm.cmd run keycloak:up
npm.cmd run smoke:keycloak
```

- Admin: http://localhost:8080 — usuário `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` (padrão dev: `admin` / `keycloak_admin_dev`).
- Realm **pelada** e client **pelada-web** vêm de `infra/keycloak/import/pelada-realm.json` na **primeira** subida do Postgres do Keycloak.
- Se o realm não aparecer (volume antigo): `docker compose down -v` nos serviços Keycloak **ou** apague só o volume `pelada_pg_keycloak` e suba de novo.

### Usuário de teste (dev, só local)

| Campo | Valor |
|-------|--------|
| E-mail | `dev@pelada.local` |
| Senha | `dev-pelada-local` |
| Atributo `phone` | `11999990000` (exemplo no import) |

**Não** usar em produção.

## Checklist F0-4 (smoke manual)

- [ ] `npm.cmd run smoke:keycloak` → `OK Keycloak smoke`
- [ ] Admin console abre em :8080
- [ ] Realm `pelada` e client `pelada-web` com URIs acima
- [ ] Login `dev@pelada.local` / `dev-pelada-local`
- [ ] (Opcional) Google IdP habilitado e testado
- [ ] Token em https://jwt.io mostra `iss` = `KEYCLOAK_ISSUER` e `sub` estável

Issue GitHub: **F0-4**, **F0-4b**, **F0-5**, **F0-6**, **F0-7**.
