# Revisão funcional Codex + enforcement

O workflow `codex-review.yml` executa o Codex pela action oficial da OpenAI e
materializa o resultado no único check **`codex-review-policy`**. Não existe um
check operacional Codex separado: execução e veredito pertencem ao mesmo job.

## Secret obrigatório

GitHub → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

- Nome: `OPENAI_API_KEY`
- Valor: uma chave da OpenAI Platform com faturamento/créditos habilitados.

A assinatura ChatGPT/Codex não deve ser presumida como crédito de API. Nunca
grave a chave em arquivo, PR, log ou comentário.

## Semântica do check

- Ausência/erro de credencial: vermelho.
- Codex não respondeu ou formato inválido: vermelho.
- Teste, build, audit, skip ou bloqueante: vermelho.
- Frontend sem teste funcional 390×844 e evidência visual: vermelho.
- Somente veredito apto, SHA atual e B0=B1=B2=0: verde.
- O Codex nunca aprova nem faz merge; verde significa apenas apto para decisão
  manual do mantenedor.

Depois do primeiro run, adicione **`codex-review-policy`** aos status checks
obrigatórios da proteção da branch `main`.
