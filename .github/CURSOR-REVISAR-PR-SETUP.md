# Revisão Cursor via webhook + enforcement

Objetivo: o GitHub dispara o agente Cursor via webhook e ele publica um parecer.
O workflow **Review policy** transforma esse parecer no único gate confiável,
chamado **`review-policy`**.

## Configuração obrigatória no Cursor

A automação **app-pelada — revisar PR** deve ficar ativa somente com o trigger
**Webhook**. Remova `PR opened`, `PR pushed` e `CI completed`, pois esses triggers
criavam um check operacional verde separado.

Cadastre no GitHub Actions os secrets
`CURSOR_AUTOMATION_REVISAR_PR_WEBHOOK` e
`CURSOR_AUTOMATION_REVISAR_PR_WEBHOOK_KEY`. O workflow envia repositório, PR,
URL e SHA ao webhook somente depois que `test:all + R-07` passar. O secret da
chave aceita tanto o valor puro quanto o cabeçalho `Bearer ...`. O agente deve
publicar a review pelo usuário **`cursor`**.

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
até o agente revisar o novo SHA. Verde significa somente **apto para
a decisão manual do mantenedor**; o agente nunca aprova nem faz merge.

## Re-run manual no PR

- Faça push do SHA corrigido; o webhook inicia uma nova revisão.
- O próprio check aguarda o CI e o parecer antes de terminar.
