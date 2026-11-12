# Política de privacidade (MVP — STORE-1)

Publicar este texto em URL **HTTPS** estável (mesmo domínio do app web) antes de submeter Play Store ou App Store. Substituir placeholders `SEU_DOMINIO` e e-mail de suporte.

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
