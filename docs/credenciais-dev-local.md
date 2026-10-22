# Credenciais e smoke — dev local (referência rápida)

Valores padrão com [.env.example](../.env.example) copiado para `.env` na raiz. **Só desenvolvimento** — nunca em produção.

Após `npm run keycloak:reset` ou 1ª subida limpa do volume `pelada_pg_keycloak`, use estes logins.

## Verificar se o Keycloak está OK

```powershell
npm.cmd run smoke:keycloak
```

Saída esperada:

```text
OK Keycloak smoke
  issuer: http://localhost:8080/realms/pelada
  client esperado no realm: pelada-web
```

- **Aviso** ` /health/ready → 404` no smoke é **normal** em `start-dev`; o realm OIDC pode estar OK mesmo assim.
- Se falhar com `fetch failed`: Keycloak não subiu — ver [ambiente-dev-auth.md](ambiente-dev-auth.md) (reset de volume, containers).

## Console de administração (realm **master**)

| Campo | Valor |
|-------|--------|
| URL | http://localhost:8080 → **Administration console** |
| Usuário | `admin` (`KEYCLOAK_ADMIN` no `.env`) |
| Senha | `keycloak_admin_dev` (`KEYCLOAK_ADMIN_PASSWORD` no `.env`) |

Bootstrap só na **primeira** subida com volume vazio. Se a senha não funcionar, rode `npm.cmd run keycloak:reset`.

## Login no app (realm **pelada**)

Tela do Keycloak ao abrir `/entrar` no Angular (http://localhost:4200).

| Campo | Valor |
|-------|--------|
| Usuário | `dev` **ou** e-mail `dev@pelada.local` |
| Senha | `dev-pelada-local` |
| Telefone (atributo) | `11999990000` (exemplo no import) |

Definido em `infra/keycloak/import/pelada-realm.json` — importado na 1ª subida do IdP com volume novo.

## OIDC (API / Angular)

| Variável | Dev |
|----------|-----|
| `KEYCLOAK_ISSUER` | `http://localhost:8080/realms/pelada` |
| `KEYCLOAK_CLIENT_ID` | `pelada-web` |
| `KEYCLOAK_JWKS_URI` | `http://localhost:8080/realms/pelada/protocol/openid-connect/certs` (host) ou interno no compose |

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm.cmd run keycloak:up` | Sobe Postgres IdP + Keycloak |
| `npm.cmd run keycloak:reset` | Apaga volume do IdP e recria credenciais + realm |
| `npm.cmd run smoke:keycloak` | Smoke OIDC |
| `npm.cmd run stack:up` | Postgres ×2 + Keycloak + API (F0-7) |

Guia completo: [ambiente-dev-auth.md](ambiente-dev-auth.md).
