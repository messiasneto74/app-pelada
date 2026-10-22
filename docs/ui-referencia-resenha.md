# Referência visual — protótipo Resenha

O **produto** continua definido pela [especificação das telas](../App%20de%20Pelada%20—%20Especificação%20das%20telas%20do%20MVP.md) e pelas [rotas Angular](arquitetura-backend-frontend.md#42-rotas-angular). O protótipo **Resenha** em `prototipo/` é a **referência de UI/UX** para implementar **T1–T4** e telas **§3.x** (layout, copy, hierarquia, estados).

| O quê | Onde |
|-------|------|
| App interativo (localStorage, sem backend) | [prototipo/index.html](../prototipo/index.html) — ver [prototipo/README.md](../prototipo/README.md) |
| **32 capturas** (16 telas × mobile 390px + desktop) | [prototipo/visual/README.md](../prototipo/visual/README.md) |
| Tokens e componentes “como no print” | [prototipo/styles.css](../prototipo/styles.css) |
| Comportamento (presença, fila, sorteio, placar) | [prototipo/app.js](../prototipo/app.js) |
| Regressão visual/fluxo do protótipo | `cd prototipo && npm ci && npm test` |

**Nome “Resenha”:** marca do protótipo interativo; no app Angular o nome do produto pode seguir “Pelada” / pelada do grupo — **tokens e layout** vêm daqui.

## Design tokens (T1 — espelhar em SCSS/Tailwind do Angular)

Extraídos de `prototipo/styles.css` (`:root`):

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#f5f6f3` | fundo da área de trabalho |
| `--paper` | `#ffffff` | cards, sidebar |
| `--ink` | `#202c27` | texto principal |
| `--muted` | `#7b847e` | legendas |
| `--green` | `#173d32` | marca, hero, `theme-color` |
| `--lime` | `#dcf58a` | CTA primário, destaques |
| `--line` | `#e7eae4` | bordas |
| `--accent` | `#6b8a45` | links, foco secundário |
| `--red` | `#b94848` | estados de erro / alerta |

**Tipografia:** títulos **Barlow Condensed** (600–800); corpo **DM Sans** (400–700). Fallback: `system-ui`. No Angular, carregar as mesmas famílias Google Fonts ou self-host.

**Mobile:** viewport de referência **390 × 844** (galeria e testes Playwright do protótipo).

## Mapa: spec MVP ↔ protótipo ↔ rotas de produção

| # | Spec § | Tela na galeria | Navegação no protótipo | Rota Angular (MVP) |
|---|--------|-----------------|------------------------|-------------------|
| 1 | 3.1 Início | Visão geral | `#inicio` | `/inicio` |
| 2 | Agenda (implícito em 3.1/3.3) | Agenda de partidas | `#partida` | lista no `/inicio` ou fluxo criar → presença |
| 3 | 3.3 Criar partida | Criar partida | modal `new-match` | `/inicio/criar-partida` |
| 4 | 3.4 Presença (confirmados) | Presença: confirmados | `#presenca` + aba Confirmados | `/partida/presenca` |
| 5 | 3.4 | Presença: pendentes | `#presenca` + aba Pendentes | idem |
| 6 | 3.4 | Presença: fila | `#presenca` + aba Fila | idem |
| 7 | 3.4 / partida | Detalhes da partida | modal `match-details` | header da partida |
| 8 | 3.5 Sorteio | Sorteio e equilíbrio | `#sorteio` | `/partida/sorteio` |
| 9 | 3.5 | Trocar jogadores | fluxo em sorteio (`swap`) | `/partida/sorteio` |
| 10 | 3.6 Em campo | Placar e cronômetro | `#campo` | `/partida/campo` |
| 11 | 3.7 Jogadores | Elenco | `#jogadores` | `/jogadores` |
| 12 | 3.8 Perfil | Perfil do jogador | modal ao clicar jogador | `/jogadores/:id` |
| 13 | 3.8 | Editar perfil | modal `edit-player` | `/jogadores/:id` (edição) |
| 14 | 3.7 | Adicionar jogador | modal novo jogador | `/jogadores` + criar |
| 15 | 3.9 Caixa | Caixa e pagamentos | `#caixa` | `/caixa` |
| 16 | 3.2 Regras | Configurações da pelada | `#regras` | `/inicio/regras` |

**Abas inferiores (T3):** no protótipo, a sidebar desktop e a **bottom nav** mobile espelham **Início** (`#inicio`), **Partida** (fluxo `#presenca` / `#sorteio` / `#campo`, com `#partida` = agenda), **Jogadores**, **Caixa**. Em produção, usar as quatro abas da spec com `routerLink` em [arquitetura §4.3](arquitetura-backend-frontend.md#43-bottom-navigation-t3).

## O que o protótipo **não** cobre (ainda é MVP via issues)

- Login Keycloak (`/entrar`), multiusuário, API, Postgres  
- Link público `/c/[token]` (histórias 33, 42 — Depois / issue dedicada)  
- Todas as regras da spec §3.2 (tags, goleiro fixo, exceção por partida) — o protótipo tem **subconjunto** em `#regras`  
- Sorteio com `packages/core` no servidor — heurística local em `app.js`

Ao fechar issues **frontend** `3.x` / `T*`: comparar com o PNG correspondente em `prototipo/visual/` e, se divergir, **a galeria + protótipo interativo prevalecem** sobre wireframes antigos.

## Atualizar capturas

```powershell
cd D:\desenvolvimento\app-futebol\prototipo
npm.cmd ci
npm.cmd run screenshots
```

Requer Python 3, Chromium (ou `CHROMIUM_PATH`) e porta **8002** livre.
