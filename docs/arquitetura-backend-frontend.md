# Arquitetura — backend, frontend e navegação

Complemento ao [historias-de-usuarios.md](../historias-de-usuarios.md). Define **stack**, **módulos do backend**, **rotas/telas** e **fluxos de navegação** alinhados ao MVP.

---

## 1. Visão geral

```mermaid
flowchart LR
  subgraph client [Frontend]
    PWA[Angular PWA]
    CoreLib[packages/core sorteio]
  end
  subgraph backend [Backend proprio]
    API[REST API Node]
    DB[(PostgreSQL)]
    Auth[Auth JWT]
    RT[WebSocket opcional]
  end
  PWA --> CoreLib
  PWA --> API
  API --> DB
  API --> Auth
  API --> RT
```

| Camada | Responsabilidade |
|--------|------------------|
| **Frontend** | Telas, navegação, formulários, sorteio na UI (chama `core`), share WhatsApp |
| **packages/core** | Algoritmo de balanceamento, métricas, sugestão de formato — **sem** React/DB |
| **Backend** | Persistência, auth, permissões (adm/jogador), presença em tempo real, regras da pelada |
| **Link público** | Presença/convidado sem app (histórias 33, 42, 82) — rotas com token |

**Stack (decisão)**

| Peça | Escolha | Motivo |
|------|---------|--------|
| Frontend | **Angular** (standalone, Angular Router) + **PWA** (`@angular/service-worker`) | Stack escolhida; mobile-first 390px |
| UI | Design tokens da spec (T1) + componentes próprios (T2); SCSS ou Tailwind via config | Alinhado ao layout do MVP |
| Backend | **API própria** (recomendado **NestJS** + Prisma + PostgreSQL) | Auth, dados compartilhados, sorteio confiável |
| Auth | **Keycloak** (OIDC): Google + e-mail/senha; Angular PKCE; API valida JWT | Ver §1.1 |
| Monorepo | `apps/pelada-web` (Angular) + `apps/api` + `packages/core` | Core de sorteio compartilhado com API |
| Hospedagem | Angular estático (Firebase Hosting, Cloudflare Pages, Nginx) + API + Postgres | Deploy separado |

### Backend é necessário?

| Cenário | Precisa de API? |
|---------|-----------------|
| **MVP da sua spec** (vários jogadores, presença, convidado, caixa, login Google/e-mail, mesma pelada em mais de um celular) | **Sim** |
| Protótipo só do organizador, um aparelho, dados no `localStorage` | Não (mas não é o produto) |
| Sorteio “de verdade” sem confiar no celular do adm | **Sorteio no servidor** (ou API que persiste o resultado oficial) |

**Resumo:** para o que você descreveu, **backend é necessário**. O Angular é só a interface; **login, banco, regras, presença, sorteio persistido e caixa** ficam na API. O `packages/core` pode rodar no **Node (API)** e, opcionalmente, no **Angular** só para pré-visualizar antes de salvar.

**Alternativa mínima (não recomendada para MVP completo):** Firebase/Supabase como “backend gerenciado” em vez de API Nest — ainda é backend, só que BaaS. Você pediu API própria; mantemos Nest/Fastify.

**Protótipo de telas (navegável)**

| Onde | Como abrir |
|------|------------|
| Navegador | Abrir [prototipo/index.html](../prototipo/index.html) no Chrome/Edge |
| Cursor | Canvas **pelada-wireframes** (painel ao lado do chat) |

---

## 1.1 Autenticação com Keycloak (recomendado)

### Opinião resumida

**Vale usar Keycloak** para login (Google + e-mail/senha), tokens OIDC e evolução sem reimplementar auth. O trade-off é **operar** outro serviço (HTTPS, backup, updates). No MVP: **um realm**, Keycloak em **Docker** na VPS ou provedor gerenciado.

A **API Nest não implementa login** — valida o JWT do Keycloak e autoriza por pelada no Postgres.

```mermaid
sequenceDiagram
  participant Angular
  participant Keycloak
  participant API
  participant DB
  Angular->>Keycloak: Login PKCE Google ou email
  Keycloak-->>Angular: access_token refresh_token
  Angular->>API: Authorization Bearer JWT
  API->>Keycloak: Valida JWKS
  API->>DB: pelada jogadores partida
```

### Configuração sugerida no Keycloak

| Item | Sugestão |
|------|----------|
| Realm | `pelada` |
| Client `pelada-web` | Público, Standard flow, **PKCE**, redirect do Angular |
| IdP | **Google** (identity broker) |
| Login | E-mail + senha no realm (Google na tela do Keycloak) |
| Atributos | `phone` (custom); foto via `picture` / Google |
| Papéis | Identidade no Keycloak; **organizador/jogador por pelada** no **Postgres da app** |

### Angular

- `angular-oauth2-oidc` ou `keycloak-angular`
- `/entrar` redireciona ao login Keycloak (Google aparece se IdP ativo)
- Sem telefone → `/entrar/completar` → `PATCH /me` na API

### API NestJS

- JWT via JWKS (`nest-keycloak-connect` ou `passport-jwt`)
- `sub` → `User.keycloakSub` (criação JIT no primeiro acesso)
- Rotas: `GET/PATCH /me` — **sem** `/auth/google` na API

### Onde ficam nome, e-mail, telefone, foto

| Dado | Onde |
|------|------|
| E-mail, senha, Google | Keycloak |
| Nome, foto | Keycloak (+ Google) |
| Telefone | Coluna na app **ou** atributo Keycloak (MVP: **app** é mais simples) |
| Pelada, sorteio, caixa | Só Postgres da app |

---

## 1.2 Backend da aplicação e hospedagem

Keycloak **não substitui** a API — só autentica.

| Camada | Stack | Dados |
|--------|-------|--------|
| Auth | Keycloak + Postgres **próprio** | usuários, IdP |
| API | NestJS + Prisma | negócio + autorização |
| App DB | PostgreSQL **separado** | elenco, partidas, draw, caixa |
| UI | Angular estático | — |

**Dois bancos Postgres** (ou dois containers): nunca misturar schema Keycloak com schema da app.

### Hospedagem sugerida (MVP)

**Opção A (recomendada):** 1 VPS (4 GB) + Docker Compose (`keycloak`, `postgres-keycloak`, `postgres-app`, `api`, reverse proxy **Caddy**/Traefik) + Angular em **Cloudflare Pages** + DNS/SSL no Cloudflare (`app.`, `api.`, `auth.`).

**Opção B:** Keycloak na VPS; **Neon/Supabase só como Postgres** da app; API em Railway/Fly.io.

**Opção C:** AWS/Azure — depois do MVP.

Checklist: HTTPS nos três hosts; backup diário dos dois Postgres; CORS só no domínio do Angular.

---

## 2. Modelo de domínio (backend)

Entidades principais e quem altera:

| Entidade | Descrição | Histórias |
|----------|-----------|-----------|
| `User` | Conta app (`keycloakSub`, telefone); identidade no Keycloak | login |
| `Pelada` | Grupo / racha | 1, 8 |
| `PeladaMember` | user + papel (`organizador` \| `jogador`) + perfil na pelada | 11, 12 |
| `PlayerProfile` | Nota, atributos, tags, posição, `isGoalkeeper`, plano pagamento, fixo lista | 14–16, 23–27 |
| `PeladaRules` | Linha/time, modalidade, modos GK, rodízio, regras sorteio, modo presença | 2–10, 33 |
| `Match` | Partida (data, local, regras override) | 9, 32 |
| `MatchAttendance` | confirmado / recusado / fila / convidado pendente | 35–46 |
| `Draw` | Resultado sorteio + score equilíbrio + seed | 47–61 |
| `MatchSession` | Quem em campo, placar, rodada rodízio | 63–70 |
| `PaymentLedger` | Quem pagou período/partida (Pix = marcar pago) | 14–18 |
| `PeladaInvite` | Link/QR entrada no grupo | 11 |

**Permissões**

| Ação | Organizador | Jogador | Link convidado |
|------|-------------|---------|----------------|
| Editar regras pelada | sim | não | não |
| Editar perfil outro jogador | sim | não* | não |
| Editar próprio perfil | sim | se 27 habilitado | não |
| Criar partida / sortear | sim | não | não |
| Confirmar própria presença | sim | sim | convidado limitado |
| Ver times sorteados | sim | sim | opcional token |

---

## 3. Backend — módulos e API

### 3.1 Módulos (pastas lógicas)

```
packages/core/          # sorteio, métricas, suggestFormat()
apps/api/               # API REST própria
  src/modules/
    auth/
    users/
    peladas/
    matches/
    attendance/
    draw/
    payments/
    invites/
apps/pelada-web/          # Angular — HttpClient + interceptors JWT
```

### 3.2 Endpoints / operações (REST JSON)

| Módulo | Operação | Uso na UI |
|--------|----------|-----------|
| **Auth** | login, logout, session | entrada |
| **Peladas** | `POST /peladas`, `GET /peladas`, `GET /peladas/:id` | criar, listar |
| **Peladas** | `PATCH /peladas/:id/rules` | config 2–10 |
| **Members** | `POST invite`, `POST join`, `PATCH role`, `DELETE` | 11, 12 |
| **Profiles** | `GET/PATCH /peladas/:id/members/:id/profile` | 23–27 |
| **Matches** | `POST/GET/PATCH /peladas/:id/matches` | 32, 13 |
| **Attendance** | `POST confirm`, `POST decline`, `POST queue`, `POST approve-guest` | 35–43 |
| **Attendance** | `POST close-list` | 38 |
| **Draw** | `POST /matches/:id/draw` body: mode, constraints | 50–55 |
| **Draw** | `PATCH /matches/:id/draw` swap player | 54 |
| **Session** | `POST start-round`, `PATCH score`, `POST rotate` | 63–68 |
| **Payments** | `GET ledger`, `POST mark-paid`, `POST generate-charge-text` | 14–18 |
| **Public** | `GET /p/:token` presença | 33, 82 |

**Realtime (opcional MVP+):** canal `match:{id}:attendance` para lista ao vivo (36).

**Sorteio:** preferir rodar `drawTeams()` no **servidor** (mesma lib `core`) para não confiar só no client; client pode pré-visualizar.

---

## 4. Frontend Angular — rotas e navegação

Alinhado à [Especificação das telas do MVP](../App%20de%20Pelada%20—%20Especificação%20das%20telas%20do%20MVP.md): **4 abas** na shell principal.

### 4.1 Estrutura de módulos (sugestão)

```
apps/pelada-web/src/app/
  core/           # auth guard, interceptors, API services
  shared/         # T2 components, ScreenHeader, bottom-nav
  features/
    auth/
    onboarding/   # criar pelada (L1)
    inicio/       # 3.1, 3.2, 3.3
    partida/      # 3.4, 3.5, 3.6
    jogadores/    # 3.7, 3.8
    caixa/        # 3.9
  layout/
    main-shell/   # router-outlet + bottom nav (T3)
```

### 4.2 Rotas Angular

| Rota | Componente | Aba | Spec |
|------|------------|-----|------|
| `/entrar` | LoginComponent | — | Auth |
| `/entrar/completar` | CompletarPerfilComponent | — | telefone/foto |
| `/onboarding/pelada` | CriarPeladaComponent | — | L1 · hist. 1 |
| `/inicio` | InicioComponent | Início | §3.1 |
| `/inicio/regras` | RegrasPeladaComponent | Início | §3.2 |
| `/inicio/criar-partida` | CriarPartidaComponent | Início | §3.3 |
| `/partida/presenca` | PresencaComponent | Partida | §3.4 |
| `/partida/sorteio` | SorteioComponent | Partida | §3.5 |
| `/partida/campo` | EmCampoComponent | Partida | §3.6 |
| `/jogadores` | JogadoresListaComponent | Jogadores | §3.7 |
| `/jogadores/:id` | JogadorPerfilComponent | Jogadores | §3.8 |
| `/caixa` | CaixaComponent | Caixa | §3.9 |

**Partida ativa:** `MatchContextService` (ou store) com `currentMatchId` — aba Partida usa sempre a partida em andamento.

**Guards:** `authGuard` em `/inicio`…; `organizadorGuard` em regras, fechar lista, sortear, caixa.

### 4.3 Bottom navigation (T3)

| Aba | `routerLink` default |
|-----|----------------------|
| Início | `/inicio` |
| Partida | `/partida/presenca` (ou última subrota visitada) |
| Jogadores | `/jogadores` |
| Caixa | `/caixa` |

### 4.4 Fluxo dentro da aba Partida

Fluxo natural do dia do jogo:

```mermaid
flowchart LR
  presenca[Presença] --> sorteio[Sorteio]
  sorteio --> jogo[Em campo]
  jogo --> presenca
```

| Etapa | Tela | Bloqueio |
|-------|------|----------|
| 1 Presença | confirmados, fila, convidados, fechar lista | sorteio exige lista fechada (configurável) |
| 2 Sorteio | equilibrado/aleatório, métricas, share | jogo pode exigir sorteio feito |
| 3 Em campo | dupla em campo, placar, rodízio GK | — |

**Header da partida:** data, local, badge “lista aberta/fechada”, botão compartilhar.

---

## 5. Fluxos de navegação (jornadas)

### 5.1 Organizador — primeira vez

```mermaid
flowchart TD
  A[Entrar] --> B[Nova pelada wizard]
  B --> C[Regras básicas formato GK]
  C --> D[Adicionar elenco]
  D --> E[Hub pelada]
  E --> F[Nova partida]
  F --> G[Presença]
  G --> H[Sorteio]
  H --> I[Em campo]
```

### 5.2 Jogador — dia da pelada

1. `/entrar` → `/app` → escolhe pelada  
2. `/m/[matchId]/presenca` → confirma “vou”  
3. `/m/[matchId]/sorteio` → vê times (somente leitura)  
4. `/m/[matchId]/jogo` → vê quem joga e placar  

### 5.3 Convidado — link sem conta completa

1. Abre `/c/[token]`  
2. Identifica nome ou pede entrada (42)  
3. Organizador aprova em presença (43)  
4. Entra no sorteio se confirmado  

### 5.4 Deep links úteis

| Link | Comportamento |
|------|----------------|
| `/c/[invite]` | Entrar na pelada |
| `/c/[matchToken]/presenca` | Só presença da partida |
| `/app/p/.../m/.../sorteio` | Abrir times direto |

---

## 6. Telas — componentes principais (frontend)

| Tela | Componentes-chave |
|------|-------------------|
| Wizard pelada | steps: identidade → formato (2–3) → GK (5–7) → presença default (33) |
| Config | seções colapsáveis: Pelada \| Sorteio \| Pagamento \| Presença |
| Elenco | lista + busca; card jogador: nota, tags, GK, plano pagamento, fixo |
| Presença | colunas: confirmado / não respondeu / fila / convidado; CTA fechar lista |
| Sorteio | colunas por time; média; score ⚖️; ações regerar, arrastar, share |
| Em campo | seletor A×B; card descanso; placar; timer; GK lado (65) |
| Share | modal: texto WhatsApp, imagem times, ocultar níveis |

**Estado local:** rascunho de sorteio antes de “publicar” para o grupo (53).

---

## 7. O que entra no MVP vs depois

| Área | MVP | Depois |
|------|-----|--------|
| Auth | e-mail magic link | telefone, social |
| Rotas | `/app` hub + partida presença/sorteio/jogo + config | caixa, stats, copa |
| Backend | CRUD pelada, partida, presença, draw persistido | Realtime, bot Zap, voz |
| Public link | presença simples | link pessoal 34 |
| Offline | — | 83 (sorteio local + sync) |

---

## 8. Ordem de implementação sugerida

1. Monorepo + `packages/core` + testes sorteio  
2. Auth + modelo `Pelada` / `Member` / `Rules`  
3. Rotas: home, hub, config, elenco  
4. Partida: presença → API draw → tela sorteio → em campo mínimo  
5. Share WhatsApp + polish mobile (84)  
6. Pagamento 14–17; Pix texto 18  

---

## 9. Referência cruzada MVP (histórias)

| MVP histórias | Rotas principais |
|---------------|------------------|
| 1–10 | `/nova-pelada`, `/config` |
| 23–27 | `/elenco`, `/elenco/[id]` |
| 32–38, 42–45 | `/m/[id]/presenca` |
| 47–61 | `/m/[id]/sorteio` |
| 63–66 | `/m/[id]/jogo` |
| 14–17 | `/caixa` (pode ser tab simples no MVP) |
