# Processo de testes e qualidade (oficial)

Este documento vale para **todas as issues** do GitHub, **todo PR** e **todo trabalho com agente no Cursor**.

## Onde os testes rodam

| Ambiente | Uso no MVP |
|----------|------------|
| **Sua máquina (Windows)** | **Único obrigatório** — `npm.cmd run test:core`, `test:api`, `test:web` |
| **GitHub Actions (CI-1)** | **Opcional / depois** — não bloqueia fechar issues agora |
| **VPS / staging** | Só para deploy manual (`DEPLOY-1`); E2E pode rodar local sem VPS |

Detalhes de comandos: [desenvolvimento-local.md](desenvolvimento-local.md).  
Suites e metas: [estrategia-testes.md](estrategia-testes.md).

## Quem executa os testes

| Quem | Quando | O quê |
|------|--------|--------|
| **Você (desenvolvedor)** | Antes de **fechar** uma issue no GitHub | Rodar na sua máquina os comandos listados no bloco **Testes obrigatórios** da issue; marcar checklist no PR/commit. |
| **Agente Cursor (IA)** | Enquanto **implementa ou corrige** uma issue que você pediu | Escreve código + testes novos, **executa os comandos no seu PC**, corrige até passar — **só no escopo da issue atual**, não a suíte inteira do projeto de uma vez. |
| **Ninguém em background** | — | Não há robô rodando 130+ testes 24h sem uma tarefa de implementação. |

## O que o agente **não** faz

- Não fecha issues no GitHub por conta própria.
- Não roda automaticamente **todas** as issues (1–58) sem você pedir implementação.
- Não substitui sua validação de produto (coluna **Validação** nas histórias).

## O que o agente **faz** (quando você pede ex.: “implementa F0-1”)

1. Implementa o escopo da issue.
2. Adiciona/atualiza testes exigidos pelo DoD da issue.
3. Roda localmente, por exemplo:
   - `npm.cmd run test:core`
   - `npm.cmd run test:api` (com Docker/Postgres quando existir)
4. Mostra passou/falhou e itera até verde **no que a issue exige**.

## Estado atual do repositório

- **Ainda não há** monorepo nem testes no disco — só planejamento e issues.
- Testes **nascem com o código**, issue a issue (`TEST-API-HARNESS`, `CORE-TEST`, cada `*-API`, etc.).

## Definition of Done (toda issue de implementação)

1. Critérios de aceite da spec/plano atendidos.
2. Testes novos da issue passando **na sua máquina** (comandos citados no PR).
3. Issue/PR referenciados (número no commit ou descrição do PR).

## Referência cruzada

- Issues GitHub: bloco **Testes obrigatórios** + **Definition of Done (issue)** (atualizado para este processo).
- Plano: [plano-issues-fases-milestones.md](plano-issues-fases-milestones.md) — template de issue.
- Script de sincronia de corpo de issues: `scripts/append-issue-test-dod.mjs`.
