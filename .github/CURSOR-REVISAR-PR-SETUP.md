# Automação Cursor **app-pelada — revisar PR** + CI

Objetivo: toda vez que o check **`test:all + R-07`** terminar no PR, a automação **revisar PR** roda no **mesmo SHA** e publica o veredito (review `cursor` + check **Cursor Automation: …** quando aplicável).

## Opção A — **CI completed** (recomendado, sem secret no GitHub)

1. Abra [app-pelada — revisar PR](https://cursor.com/automations/f4919674-ce37-11f1-89ee-7aa6f0729b11) (ou Automations → editar).
2. Repositório: **`messiasneto74/app-pelada`**.
3. **Adicione** o trigger **GitHub → CI completed**.
4. Filtro do check: **`test:all + R-07`** (nome exato do job em `.github/workflows/pr-tests.yml`).
5. Mantenha também **Pull request pushed** (revisão no push, se quiser paralelo ao CI).
6. Salve e ative.

A automação dispara **quando o workflow PR tests termina** (verde ou vermelho).

## Opção B — Webhook no fim do workflow (disparo explícito)

1. Na mesma automação, adicione trigger **Webhook** e salve.
2. Copie a **URL** e a **API key** do webhook.
3. No GitHub (repo **app-pelada**):

```powershell
gh secret set CURSOR_AUTOMATION_REVISAR_PR_WEBHOOK --repo messiasneto74/app-pelada
gh secret set CURSOR_AUTOMATION_REVISAR_PR_WEBHOOK_KEY --repo messiasneto74/app-pelada
```

O job **`Cursor Automation — revisar PR`** em `pr-tests.yml` faz `POST` no webhook **depois** de `test:all + R-07` (sucesso ou falha).

## O que aparece no GitHub

| Onde | O quê |
|------|--------|
| **Checks** | `test:all + R-07` (Actions) |
| **Checks** | `Cursor Automation: app-pelada — revisar PR` (quando a automação roda) |
| **Conversation / Reviews** | Comentário de review do usuário **`cursor`** com VEREDITO |

O veredito **não** substitui o check de testes; os dois convivem.

## Re-run manual no PR

- **Checks** → re-run **PR tests** → com Opção A, a automação dispara de novo ao fim do CI.
- Ou **workflow_dispatch** em **PR tests** (se habilitado) + novo push.
