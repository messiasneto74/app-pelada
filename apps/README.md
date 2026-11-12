# Apps do monorepo

| Pasta | Pacote npm | Comando (na raiz) |
|-------|------------|-------------------|
| `pelada-web/` | `@pelada/web` | `npm run dev:web` → http://localhost:4200 |
| `api/` | `@pelada/api` | `npm run dev:api` → http://localhost:3000/health |
| `pelada-mobile/` | `@pelada/mobile` | `npm run build:mobile` · `cap:open:android` — [README](pelada-mobile/README.md) |

| Pacote | Caminho |
|--------|---------|
| `@pelada/core` | `packages/core/` — `npm run test:core` |

Testes (na raiz do monorepo): `npm.cmd run test:core` · `test:api` · `test:web` · **`test:all`**. Detalhes: [desenvolvimento-local.md](../docs/desenvolvimento-local.md).

Protótipo visual (sem auth): [../prototipo/](../prototipo/).
