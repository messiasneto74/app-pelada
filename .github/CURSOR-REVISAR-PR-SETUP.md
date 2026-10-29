# Automação Cursor **app-pelada — revisar PR** + enforcement

Objetivo: a automação revisa o SHA atual e publica um parecer. O workflow
**Review policy** transforma esse parecer em um gate confiável chamado
**`review-policy`**.

## Trigger da automação — **CI completed**

1. Abra [app-pelada — revisar PR](https://cursor.com/automations/f4919674-ce37-11f1-89ee-7aa6f0729b11) (ou Automations → editar).
2. Repositório: **`messiasneto74/app-pelada`**.
3. **Adicione** o trigger **GitHub → CI completed**.
4. Filtro do check: **`test:all + R-07`** (nome exato do job em `.github/workflows/pr-tests.yml`).
5. Mantenha também **Pull request pushed** se quiser iniciar a revisão já no push.
6. Salve e ative.

A automação dispara quando `test:all + R-07` termina. Não existe mais job de
webhook que fica verde sem revisar nada.

## O que aparece no GitHub

| Onde | O quê |
|------|--------|
| **Checks** | `test:all + R-07` (Actions) |
| **Checks** | `Cursor Automation: app-pelada — revisar PR` — indica somente que a automação executou; **não é aprovação** |
| **Checks** | `review-policy` — gate autoritativo do parecer |
| **Conversation / Reviews** | Comentário de review do usuário **`cursor`** com VEREDITO |

## Regra do check autoritativo

| Parecer do Cursor no SHA atual | `review-policy` |
|--------------------------------|-----------------|
| `VEREDITO: APTO PARA APROVAÇÃO MANUAL`, SHA atual, issue/milestone e `B0=0, B1=0, B2=0` sem texto contraditório | ✅ verde |
| `VEREDITO: REQUEST_CHANGES — REPROVADO` | ❌ vermelho |
| Parecer ausente, antigo, dispensado, incompleto ou contraditório | ❌ vermelho |
| Cursor registra review `APPROVED` | ❌ vermelho — o agente não pode aprovar |

Cada push muda o SHA e invalida o parecer anterior. O check permanece vermelho
até a automação revisar o novo SHA. Verde significa somente **apto para a decisão
manual do mantenedor**; o agente nunca aprova nem faz merge.

## Re-run manual no PR

- **Checks** → re-run **PR tests**; o trigger **CI completed** inicia nova revisão.
- Depois do novo parecer, `pull_request_review` recalcula `review-policy`.
