# Processo de testes e qualidade (oficial)

Este documento vale para **todas as issues** do GitHub, **todo PR** e **todo trabalho com agente no Cursor**.

Instruções do repositório para agentes (local, Cloud e revisão de PR): **`AGENTS.md`** na raiz e regras em **`.cursor/rules/`**.

## Onde os testes rodam

| Ambiente | Uso no MVP |
|----------|------------|
| **Sua máquina (Windows)** | **Único obrigatório** — `npm.cmd run test:all` (`test:core`, `test:api`, `test:web`, `test:scripts:cov` ≥80% em `scripts/lib`) |
| **GitHub Actions (CI-1)** | Todo PR → `test:all` + R-07 (check **`test:all + R-07`**). Bloqueia merge só com [branch protection](ci-github.md). |
| **VPS / staging** | Só para deploy manual (`DEPLOY-1`); E2E pode rodar local sem VPS |

Detalhes de comandos: [desenvolvimento-local.md](desenvolvimento-local.md).  
Suites e metas: [estrategia-testes.md](estrategia-testes.md).

## Quem executa os testes

| Quem | Quando | O quê |
|------|--------|--------|
| **Você (desenvolvedor)** | Antes de **aprovar merge** | `npm.cmd run test:all` + smokes manuais da issue (Docker quando aplicável). |
| **Agente Cursor (IA)** | Implementação + **após merge confirmado** | `test:all` verde; então `npm.cmd run issue:mark-dod -- <#issue>` para marcar checkboxes no GitHub. Alinhado à automação **app-pelada — revisar PR** (R-01…R-07). |
| **Ninguém em background** | — | Não há robô rodando 130+ testes 24h sem uma tarefa de implementação. |

## O que o agente **não** faz

- Não faz merge nem push em `main` sem pedido explícito.
- Não roda **todas** as issues (1–58) de uma vez sem tarefa de implementação.
- Não substitui sua validação de produto (coluna **Validação** nas histórias).

## O que o agente **faz** (quando você pede ex.: “implementa F0-1”)

1. Implementa o escopo da issue.
2. Adiciona/atualiza testes exigidos pelo DoD da issue.
3. Roda `npm.cmd run test:all` (e smokes da issue).
4. Mostra passou/falhou e itera até verde; scripts em `scripts/lib` com cobertura ≥80% (R-07).

## Automação de PR (Cursor) + CI

Veredito **TESTES FALHANDO** com **0 testes falhando** = reprovação por **R-07** (cobertura) ou **§5** (domínio fora do escopo da issue). Ver `.cursor/rules/pelada-agente-testes.mdc`.

O workflow [pr-tests.yml](../.github/workflows/pr-tests.yml) repete o mesmo gate no GitHub (check vermelho). Detalhes: [ci-github.md](ci-github.md).

## Definition of Done (toda issue de implementação)

1. Critérios de aceite da spec/plano atendidos.
2. Testes novos da issue passando **na sua máquina** (comandos citados no PR).
3. Issue/PR referenciados (número no commit ou descrição do PR).

## Referência cruzada

- Issues GitHub: bloco **Testes obrigatórios** + **Definition of Done (issue)** (atualizado para este processo).
- Plano: [plano-issues-fases-milestones.md](plano-issues-fases-milestones.md) — template de issue.
- Script de sincronia de corpo de issues: `scripts/append-issue-test-dod.mjs`.
