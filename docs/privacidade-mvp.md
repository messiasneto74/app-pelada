# Política de privacidade (MVP — STORE-1)

Publicar em URL **HTTPS** estável no mesmo domínio do Angular:

- Página estática incluída no build web: `apps/pelada-web/public/privacidade.html` → `https://app.<seu-dominio>/privacidade.html` após `build:web` / deploy staging (DEPLOY-1).

Substituir placeholders `SEU_DOMINIO` e e-mail de suporte na cópia publicada.

## Pelada — resumo

O app **Pelada** ajuda a organizar partidas, presença e sorteio de times.

## Dados coletados

| Dado | Finalidade |
|------|------------|
| Conta (nome, e-mail) via Keycloak | Login e identificação |
| Telefone (quando solicitado no onboarding) | Contato do organizador |
| Dados da pelada, jogadores, partidas | Funcionalidade do app |
| Fotos enviadas (pelada/jogador) | Exibição no elenco |

Não vendemos dados pessoais.

## Onde os dados ficam

Servidor da API (`https://api.SEU_DOMINIO`) e banco PostgreSQL sob controle do operador da pelada / mantenedor do app.

## Autenticação

Login via OpenID Connect (Keycloak). Tokens JWT são validados pela API; não armazenamos senhas no app.

## Contato

Suporte: `suporte@SEU_DOMINIO`

Última atualização: substituir pela data de publicação.
