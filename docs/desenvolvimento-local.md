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
py -m http.server 8000
# http://localhost:8000/#inicio
```

Testes do protótipo: `npm.cmd ci` e `npm.cmd test` (porta 8001). Galeria: [prototipo/visual/README.md](../prototipo/visual/README.md).

## Estrutura (após F0-1)

```
app-futebol/
  prototipo/           # referência UI (Resenha) — não vai para produção
  apps/pelada-web/     # Angular — fonte das telas MVP
  apps/api/            # Nest + Prisma
  packages/core/       # sorteio (Vitest)
  apps/pelada-mobile/  # Capacitor — após STORE-1 (Play / App Store)
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

## Subir ambiente integrado (após F0-7)

```powershell
docker compose up -d
npm.cmd run dev:api
npm.cmd run dev:web
```

- Web: http://localhost:4200  
- API: http://localhost:3000  
- Keycloak: http://localhost:8080 (realm `pelada` — ver issue F0-4)

## Modo dev sem Keycloak

Até F0-4/5 prontos: usar **modo dev** na tela Entrar (issue F0-5) com API em `DEV_AUTH_SUB` — documentado em `apps/api/.env.example` (issue DOC-1).

## E2E (issue E2E-1)

Rodar **local** com stack Docker + Playwright; **não** depende de VPS no início.

## PowerShell

Se `npm install` falhar com `PSSecurityException`:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

ou use sempre `npm.cmd` / `npx.cmd`.
