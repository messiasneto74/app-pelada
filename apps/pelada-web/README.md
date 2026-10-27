# @pelada/web

Angular 19 — app Pelada (`apps/pelada-web`).

## Dev (monorepo)

Na **raiz** do repositório:

```powershell
npm.cmd run dev:web
```

`http://localhost:4200` — Keycloak e API: [desenvolvimento-local.md](../../docs/desenvolvimento-local.md).

### Tema Resenha (T1)

Tokens em `src/theme/` (`resenha-tokens.scss` + utilitários em `resenha-base.scss`). Prévia visual (390px): `http://localhost:4200/dev/tema`. Referência: [ui-referencia-resenha.md](../../docs/ui-referencia-resenha.md).

### Shell e navegação (T3)

Rotas autenticadas dentro de `MainShellComponent` com **bottom nav** (Início, Partida, Jogadores, Caixa). Placeholders em `/inicio/regras`, `/partida/*`, `/jogadores`, `/caixa`. Ver [arquitetura §4.2–4.3](../../docs/arquitetura-backend-frontend.md).

### Componentes base (T2)

Standalone em `src/app/ui/` (`pelada-card`, `pelada-chip`, `pelada-avatar`, `pelada-progress`, `pelada-switch`, `pelada-segment`, `pelada-field`, `peladaInput`, `peladaButton`). Prévia: `http://localhost:4200/dev/componentes`.

## Testes unitários (TEST-WEB-HARNESS)

**Runner:** Karma + Jasmine (padrão `@angular-devkit/build-angular:karma` em `angular.json`).

| Comando (raiz) | Uso |
|----------------|-----|
| `npm.cmd run test:web` | Local (Windows), `ChromeHeadless` |
| `npm.cmd run test:web:ci` | Igual ao CI (flags via `CHROME_BIN` / wrapper no Linux) |

Dentro de `apps/pelada-web`:

```bash
npm test          # ng test --watch=false --browsers=ChromeHeadless
npm run test:ci   # alinhado ao GitHub Actions
```

### Suites de exemplo (auth F0-6)

| Arquivo | Casos |
|---------|-------|
| `src/app/auth/auth.guard.spec.ts` | token válido; redirect `/entrar` |
| `src/app/auth/auth-bearer.interceptor.spec.ts` | Bearer na API; sem token; URL fora da API; trailing slash |
| `src/app/auth/phone-required.guard.spec.ts` | telefone ok; redirect completar |
| `src/app/auth/organizador.guard.spec.ts` | stub até API de papel |

Novos testes de lógica: `*.spec.ts` ao lado do código; rodar `npm.cmd run test:web` ou `npm.cmd run test:all` na raiz.

## Build

```powershell
npm.cmd run build:web
```
