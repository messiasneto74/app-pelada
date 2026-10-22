# O que existe hoje no repositório (vs produto)

Este repo **não está vazio**, mas o **app de produção ainda não foi criado**. Até a issue **F0-1**, não há pasta `apps/` nem `packages/`.

## O que já temos (agora)

| Parte | O que é | Serve para |
|-------|---------|------------|
| **Docs** | Spec MVP, arquitetura, plano de issues, testes | Contrato do que implementar |
| **Issues GitHub** | 59 tarefas (F0, T*, 3.x, CORE, deploy, lojas) | Ordem de trabalho |
| **Protótipo Resenha** | HTML/CSS/JS em `prototipo/` + galeria `visual/` | Referência de **tela e fluxo** (dados só no navegador) |
| **Scripts** | `scripts/github-issues.json`, `append-issue-test-dod.mjs` | Sincronizar issues |

Isso é **planejamento + referência visual** — ainda não é o sistema que vários celulares usam com login e banco.

## O que é monorepo (virá na F0-1)

**Monorepo** = **um único repositório Git** com vários projetos npm ligados:

```text
app-pelada/
  package.json          ← scripts na raiz: npm run dev:web, test:core, …
  apps/
    pelada-web/         ← Angular (telas, rotas, Keycloak no browser)
    api/                ← NestJS + Prisma (dados compartilhados, sorteio oficial)
  packages/
    core/               ← algoritmo de sorteio (testes Vitest, usado pela API)
```

Antes da F0-1 isso **não existe no disco** — só está descrito na arquitetura e na issue. Por isso dizemos que a **infraestrutura de produto** (API + Angular + core) ainda é planejamento: o desenho está pronto; o código começa na implementação da **F0-1**.

## Depois da F0-1 (visão)

| Você roda | O que acontece |
|-----------|----------------|
| `npm run dev:web` | Angular local (shell vazio → depois telas) |
| `npm run dev:api` | API com health check |
| `npm run test:core` | Testes do sorteio em `packages/core` |
| Docker (F0-7) | Postgres + Keycloak na sua máquina |

O protótipo em `prototipo/` **continua** como referência; o Angular **copia layout**, não substitui o protótipo por symlink.

## Próximo passo oficial

Issue **[F0-1](https://github.com/messiasneto74/app-pelada/issues/1)** — criar a árvore acima e o primeiro `npm install` na raiz.
