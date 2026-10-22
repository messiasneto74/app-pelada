# Desenvolvimento e testes — só na sua máquina (MVP)

**Decisão:** testes rodam **localmente** (`npm run test:*`). **CI no GitHub (issue CI-1)** fica **para depois** — não bloqueia fechar issues no início.

**Quem roda:** você antes de fechar a issue; o **agente Cursor** roda os mesmos comandos **no seu PC** enquanto implementa a issue que você pediu (não a suíte inteira sozinho). Processo completo: [processo-testes-e-qualidade.md](processo-testes-e-qualidade.md).

## Pré-requisitos

| Ferramenta | Versão sugerida | Uso |
|------------|-----------------|-----|
| **Node.js** | 20 LTS ou 22 | monorepo |
| **npm** | vem com Node | no PowerShell use `npm.cmd` se der erro de script |
| **Docker Desktop** | opcional no 1º dia | Postgres + Keycloak local (`F0-7`); sem Docker = só `core` + API com DB em nuvem depois |
| **Git** | qualquer recente | clone + issues |

## Protótipo Resenha (já no repo)

```powershell
cd D:\desenvolvimento\app-futebol\prototipo
npm.cmd run dev
# http://127.0.0.1:8000/#inicio
```

Testes do protótipo: `npm.cmd ci`, `npx.cmd playwright install chromium`, `npm.cmd test` (servidor Node na porta 8001). Galeria: [prototipo/visual/README.md](../prototipo/visual/README.md).

## Estrutura do monorepo (F0-1+)

```
app-futebol/
  package.json         # workspaces + npm run dev:* / test:*
  prototipo/           # referência UI (Resenha) — não vai para produção
  apps/pelada-web/     # @pelada/web — Angular
  apps/api/            # @pelada/api — Nest (Prisma na F0-2)
  packages/core/       # @pelada/core — sorteio (Vitest)
  apps/pelada-mobile/  # Capacitor — após STORE-1
```

Primeira vez:

```powershell
cd D:\desenvolvimento\app-futebol
npm.cmd install
npm.cmd run test:core
npm.cmd run test:api
npm.cmd run test:web
```

**Onde publicar:** web em `DEPLOY-1`; lojas em `STORE-1` — [publicacao-lojas-play-app-store.md](publicacao-lojas-play-app-store.md).

## Comandos de teste (local)

```powershell
cd D:\desenvolvimento\app-futebol
npm.cmd install

npm.cmd run test:core    # packages/core — Vitest
npm.cmd run test:api     # apps/api — precisa Postgres teste (Docker)
npm.cmd run test:web     # após TEST-WEB-HARNESS
```

**Definition of Done (local):** antes de fechar a issue, os comandos acima relevantes à issue passam **no seu PC**.

## Variáveis e Keycloak (antes de codar F0-4)

1. Copie [.env.example](../.env.example) → `.env` na raiz (quando existir compose na **F0-7**).
2. Siga o guia **[ambiente-dev-auth.md](ambiente-dev-auth.md)** — portas, client `pelada-web`, redirect URIs, fluxo Angular ↔ Keycloak ↔ API.
3. O que **não** entra no MVP de segurança/produto: **[escopo-seguranca-fora-mvp.md](escopo-seguranca-fora-mvp.md)** (convite grupo, WAF, CI-1, Pix 18).

## Postgres (F0-2)

Copie `.env.example` → `.env` na raiz (obrigatório para `db:migrate` e para a API enxergar o banco).

- **`Environment variable not found: DATABASE_URL`:** falta o `.env` na **raiz** do repo (`app-futebol`, não `D:\desenvolvimento`).
- **`P1000` / credenciais inválidas:** a senha em `DATABASE_URL` deve ser a **mesma** que `POSTGRES_APP_PASSWORD` usada na **primeira** subida do container. Se você mudou a senha depois, ajuste `DATABASE_URL` ou recrie o volume: `docker compose down -v` e `docker compose up -d postgres-app` (apaga dados locais).

### Opção A — Docker (recomendado para F0-7)

Requer **Docker Desktop** instalado e no PATH (`docker version` no PowerShell).

**Docker instalado mas o terminal não reconhece `docker`:**

1. Feche **todos** os terminais (PowerShell, CMD, Cursor) e abra um **novo** — o PATH só atualiza em sessões novas.
2. Se ainda falhar, reinicie o **Windows** (comum após a primeira instalação).
3. Teste o caminho completo (ajuste se não existir):

```powershell
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" version
```

4. Se o comando acima funcionar, adicione ao PATH do **usuário** (feche e abra o terminal de novo):

```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  $env:Path + ";C:\Program Files\Docker\Docker\resources\bin",
  "User"
)
```

5. No Docker Desktop: **Settings** → confirme que o engine está **Running**; em versões recentes, verifique opções de integração com terminal/WSL.

6. Último recurso: **Settings** → **Troubleshoot** → **Reset to factory defaults** ou reinstale marcando integração com CLI.

```powershell
winget install -e --id Docker.DockerDesktop
# Reinicie o PC se pedir; abra o Docker Desktop uma vez
cd D:\desenvolvimento\app-futebol
docker compose up -d postgres-app
npm.cmd run db:migrate
npm.cmd run dev:api
```

### Opção B — Postgres instalado no Windows (sem Docker)

1. Instale [PostgreSQL 16](https://www.postgresql.org/download/windows/) (porta **5432**).
2. Crie banco `pelada_app` e usuário/senha (ex.: `pelada_app` / `pelada_app_dev`).
3. No `.env` da raiz:

```env
DATABASE_URL=postgresql://pelada_app:pelada_app_dev@localhost:5432/pelada_app
```

4. `npm.cmd run db:migrate` e `npm.cmd run dev:api`.

### Opção C — Postgres na nuvem (dev)

[Neon](https://neon.tech) ou similar: copie a connection string para `DATABASE_URL` no `.env`, depois `npm.cmd run db:migrate`.

### Sem Postgres por enquanto

A API **sobe**; `/health` fica `database: "down"`. Você pode seguir **F0-3** (CORS/erros) e instalar Docker/Postgres antes de **F0-4** (Keycloak também usa Docker na Opção A).

`GET /health` com Postgres no ar: `database: "ok"`.

Teste de integração Prisma (opcional): `$env:RUN_DB_TESTS="1"; npm.cmd run test:api -- --testPathPattern=prisma.integration`

## Keycloak (F0-4)

```powershell
cd D:\desenvolvimento\app-futebol
npm.cmd run keycloak:up
# aguarde ~30–90s na primeira subida
npm.cmd run smoke:keycloak
```

Detalhes, usuário `dev@pelada.local` e Google IdP: [ambiente-dev-auth.md](ambiente-dev-auth.md).

## Subir ambiente integrado (após F0-7)

```powershell
docker compose up -d
npm.cmd run dev:api
npm.cmd run dev:web
```

| Serviço | URL |
|---------|-----|
| Web | http://localhost:4200 |
| API | http://localhost:3000 |
| Keycloak | http://localhost:8080 — realm `pelada` |

## Modo dev sem Keycloak

Até F0-4/5 prontos: `DEV_AUTH_BYPASS=true` só na API local (ver `.env.example`) — **F0-5**; nunca em produção.

## E2E (issue E2E-1)

Rodar **local** com stack Docker + Playwright; **não** depende de VPS no início.

## PowerShell

Se `npm install` falhar com `PSSecurityException`:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

ou use sempre `npm.cmd` / `npx.cmd`.
