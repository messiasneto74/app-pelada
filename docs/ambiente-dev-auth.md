# Ambiente local — URLs, Keycloak e Angular (pré F0-1 / F0-4)

Contrato de portas e OIDC para **dev na sua máquina**. Produção troca hosts por `https://app.`, `https://api.`, `https://auth.` (mesmos nomes de realm e client).

Copie [.env.example](../.env.example) para `.env` na raiz (Compose: `npm run stack:up` ou serviços parciais — ver [desenvolvimento-local.md](desenvolvimento-local.md)).

**Credenciais dev (admin, usuário `dev`, smoke):** [credenciais-dev-local.md](credenciais-dev-local.md).

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
| Standard flow | ON (legado / IdP Google via redirect) |
| Direct access grants | **ON** (login in-app Resenha — Resource Owner Password) |
| Valid redirect URIs | `http://localhost:4200/*`, `com.pelada.app://callback` (app empacotado) |
| Valid post logout redirect URIs | `http://localhost:4200/entrar` (ou `…/*` — o app usa `/entrar` como `redirectUri`; ver `auth.config.ts`) |
| Web origins | `http://localhost:4200`, `http://localhost`, `https://localhost` (origem real da WebView Android — `androidScheme: 'https'` em `capacitor.config.ts`), `capacitor://localhost` |
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

Botão "Entrar com Google" em `/entrar` chama `AuthService.loginWithGoogle()`, que inicia o
authorization code flow com `kc_idp_hint=google` (pula a tela própria do Keycloak). No
**navegador**, é um redirect normal (`window.location.href`). No **app empacotado**
(Capacitor), a Google recusa login OAuth dentro de WebView embutida
(`disallowed_useragent`) — por isso `buildAuthConfig()` detecta `Capacitor.isNativePlatform()`
e abre o fluxo no **navegador do sistema** via `@capacitor/browser`; o retorno chega pelo
deep link `com.pelada.app://callback` (`AndroidManifest.xml` / `Info.plist`), capturado por
`App.addListener('appUrlOpen', …)` em `AuthService`, que completa o code flow com
`tryLoginCodeFlow` e fecha o navegador.

#### Testar em dispositivo físico (celular na mesma rede) ou validar o redirect do Google

O Google recusa IP de LAN cru (ex. `192.168.1.6`) como redirect URI — só aceita
`localhost` ou um domínio "de verdade". Use um DNS curinga (`<ip>.nip.io`, resolve
pro próprio IP): o Keycloak (`KC_HOSTNAME_STRICT: false`) devolve o mesmo host que
o cliente usou.

1. Edite `apps/pelada-web/src/environments/environment.development-device.ts` com
   o IP atual da sua máquina na rede (`LAN_HOST`).
2. Cadastre esse mesmo host (`http://<ip>.nip.io:8080/realms/pelada/broker/google/endpoint`)
   como redirect URI adicional no client OAuth do Google Cloud Console.
3. Rode a API local (`npm run dev:api`) — ela escuta em todas as interfaces por padrão
   (`app.listen(port)` sem host fixo), então já aceita conexão da LAN sem mudança.
   Se usar `npm run stack:up` (API em container) em vez disso, publique também a porta
   da API pra fora de `127.0.0.1` no `docker-compose.yml`.
4. Adicione o host do nip.io em `CORS_ORIGIN` (no `.env` da API), separado por vírgula
   do `localhost`, por exemplo: `CORS_ORIGIN=http://localhost:4200,http://192.168.1.6.nip.io:4200`.
   Sem isso a API rejeita as chamadas vindas do nip.io por CORS.
5. Troque também `KEYCLOAK_ISSUER` (no `.env` da API) pro host do nip.io, por exemplo:
   `KEYCLOAK_ISSUER=http://192.168.1.6.nip.io:8080/realms/pelada`. O token do Keycloak
   carrega o host que o navegador usou (`iss`); se a API continuar esperando `localhost`
   nessa variável, ela rejeita o token com 401 mesmo com o login tendo funcionado.
   **Volte pro valor de `localhost` depois** (ou mantenha dois `.env` separados), senão
   o login normal por `npm run dev:web` para de funcionar.
6. `npm run dev:web:device` em vez de `npm run dev:web` — sobe o Angular com esse
   environment (fileReplacement `development-device` no `angular.json`) escutando em
   `0.0.0.0` (serve `host`), sem precisar editar `environment.development.ts` toda vez
   que for testar no PC vs. no celular.

O `docker-compose.yml` publica o Keycloak em todas as interfaces (`${KEYCLOAK_HTTP_PORT:-8080}:8080`,
sem `127.0.0.1:`), justamente pra aceitar essas conexões vindas da LAN. É um Keycloak
de desenvolvimento (`start-dev`, sem TLS) — não suba esse compose fora da sua rede local/dev.

---

## Fluxo no app (F0-5 / F0-6 + UX-AUTH in-app)

Login e cadastro ficam em **http://localhost:4200/entrar** (UI Resenha). O Angular obtém tokens no endpoint Token do Keycloak (`grant_type=password`); não há redirect para a UI do IdP no caminho feliz.

```mermaid
sequenceDiagram
  participant U as Usuário
  participant W as Angular :4200
  participant K as Keycloak :8080
  participant A as API :3000

  U->>W: /entrar (e-mail + senha)
  alt Criar conta
    W->>A: POST /register
    A->>K: Admin API cria usuário
  end
  W->>K: POST token (password grant + client_id público)
  K-->>W: access_token (+ refresh)
  W->>A: GET /me Bearer access_token
  A->>K: Valida JWT (JWKS)
  A->>A: JIT User por sub
  A-->>W: Perfil app (telefone, pelada ativa)
```

1. **Angular** guarda `access_token` via `angular-oauth2-oidc` (`fetchTokenUsingPasswordFlow`).
2. **Interceptor** adiciona `Authorization: Bearer …` em chamadas à API.
3. **API** não emite sessão própria — só JWT Keycloak. `POST /register` só provisiona usuário no IdP (não troca senha por token).
4. Sem telefone → `/entrar/completar` → `PATCH /me`.
5. **Volume Keycloak já existente:** o import JSON só roda na 1ª subida. Ative **Direct access grants** no client `pelada-web` (Admin Console) **ou** `npm.cmd run keycloak:reset`.

### Rotas Angular (auth)

| Rota | Guard |
|------|--------|
| `/entrar` | Público; formulário in-app (login/cadastro) |
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

## Testar login no Angular (F0-5 / in-app)

1. `npm.cmd run keycloak:up` e `npm.cmd run dev:api` (API com **`DEV_AUTH_BYPASS=false`** para JWT real).
2. `npm.cmd run dev:web` → http://localhost:4200/entrar → e-mail/senha **no próprio app**.
3. Login `dev@pelada.local` / `dev-pelada-local` (ou **Criar conta** para um e-mail novo).
4. Sem telefone na API → `/entrar/completar`; com telefone → `/inicio`.

Se o login in-app falhar com `unauthorized_client`: Direct Access Grants ainda OFF no client — Admin Console ou `keycloak:reset`.

## Modo dev sem Keycloak (temporário)

Com **F0-4b**, a API aceita `DEV_AUTH_BYPASS=true` no `.env` (qualquer `Authorization: Bearer …` vira o `DEV_AUTH_SUB`). Teste rápido:

```powershell
# .env: DEV_AUTH_BYPASS=true
npm.cmd run dev:api
curl -H "Authorization: Bearer teste" http://localhost:3000/me
```

**Desligado** em staging/produção. Com Keycloak no ar e bypass `false`, use o `access_token` real no Bearer.

---

## Staging / produção (referência)

| Dev | Produção |
|-----|----------|
| http://localhost:4200 | https://app.seudominio.com |
| http://localhost:3000 | https://api.seudominio.com |
| http://localhost:8080 | https://auth.seudominio.com |

Cadastrar **as três URLs de produção** no client Keycloak (redirect, logout, web origins). Capacitor (**STORE-1**): incluir scheme/deep link acordado no mesmo client.

---

## O que é automático vs o que é você (F0-4)

| Automático (`npm run keycloak:up`) | Opcional / depois |
|-----------------------------------|-------------------|
| Container Keycloak + Postgres do Keycloak | Sua conta Google no login |
| Realm **pelada**, client **pelada-web** (PKCE) | IdP Google (Admin Console + OAuth Google Cloud) |
| Atributo **phone** no usuário dev (import) | Perfil **phone** no realm: Admin → Realm settings → User profile (1 min) |
| Usuário dev `dev@pelada.local` (só local) | Login no Angular (**F0-5**) |

**Não** é preciso “configurar Keycloak com sua conta” antes do smoke. O `smoke:keycloak` só pergunta se o servidor em `:8080` já está de pé e se o realm responde OIDC.

## Subir Keycloak local (F0-4)

Na raiz do monorepo (`.env` alinhado com `.env.example`):

```powershell
npm.cmd run keycloak:up
# 1ª subida com import: espere 1–4 min antes do smoke
npm.cmd run smoke:keycloak
```

Se o smoke falhar com `fetch failed`:

```powershell
docker ps -a --filter name=pelada-keycloak
docker logs pelada-keycloak --tail 80
```

- **Restarting / erro de DB / smoke `fetch failed`:** senha do Postgres do Keycloak fica **gravada no volume** na 1ª subida. Se mudou `POSTGRES_KEYCLOAK_PASSWORD` no `.env`, o container entra em loop. **Reset:**

```powershell
npm.cmd run keycloak:reset
# aguarde 1–3 min
npm.cmd run smoke:keycloak
```

Manual (se `volume is in use`): pare e remova os containers **antes** do volume:

```powershell
docker compose stop keycloak postgres-keycloak
docker rm -f pelada-keycloak pelada-postgres-keycloak
docker volume rm app-futebol_pelada_pg_keycloak
docker compose up -d postgres-keycloak keycloak
```

Volumes têm nome fixo `pelada_pg_keycloak` (antes do fix F0-7 podia ser `app-futebol_pelada_pg_keycloak` — remova com `docker volume ls`).

- **Senha admin / `dev` não funcionam** com Keycloak no ar: quase sempre é volume antigo **sem** reimport do realm — use `keycloak:reset` acima (não adianta repetir senha do doc).
- **Porta 8080:** outro programa usando 8080? Mude `KEYCLOAK_HTTP_PORT` no `.env` e `KEYCLOAK_ISSUER` / URLs no Angular depois.

- Admin: http://localhost:8080 — usuário `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` (padrão dev: `admin` / `keycloak_admin_dev`).
- Realm **pelada** e client **pelada-web** vêm de `infra/keycloak/import/pelada-realm.json` na **primeira** subida do Postgres do Keycloak.
- Se o realm não aparecer ou logs mostram `Failed to run import`: atualize o repo (`git pull`), `docker compose stop keycloak`, `docker compose up -d keycloak`. Se import falhou várias vezes, apague o volume `pelada_pg_keycloak` e suba de novo.

### Atributo `phone` (após 1º login no Admin)

Realm **pelada** → **Realm settings** → **User profile** → **Create attribute** → Name: `phone`, Display name: Telefone → Save. (O JSON de import do KC 26 não aceita `userProfile` no realm export.)

### Usuário de teste (dev, só local)

| Campo | Valor |
|-------|--------|
| Username | `dev` (ou e-mail `dev@pelada.local`) |
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
