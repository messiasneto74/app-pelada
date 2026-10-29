# Revisão manual do Cursor + enforcement

Objetivo: o agente Cursor revisa manualmente o SHA atual e publica um parecer.
O workflow **Review policy** transforma esse parecer no único gate confiável,
chamado **`review-policy`**.

## Automação externa desativada

A automação **app-pelada — revisar PR** deve permanecer desativada. Ela criava
um check verde quando a execução terminava, mesmo se o parecer reprovava o PR.

Para revisar, abra manualmente um agente Cursor, informe a URL e o número do PR
e mande seguir `AGENTS.md`. O agente deve publicar a review pelo usuário
**`cursor`** no SHA atual. Nenhum check operacional separado deve ser criado.

## O que aparece no GitHub

| Onde | O quê |
|------|--------|
| **Checks** | `test:all + R-07` (Actions) |
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
até o agente revisar manualmente o novo SHA. Verde significa somente **apto para
a decisão manual do mantenedor**; o agente nunca aprova nem faz merge.

## Re-run manual no PR

- Peça uma nova revisão manual do SHA atual ao agente Cursor.
- Depois do novo parecer, `pull_request_review` recalcula `review-policy`.
