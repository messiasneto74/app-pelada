# Seed de usuários de teste (`npm run seed:test-users`)

Script pra popular uma pelada real com usuários de teste (login real no Keycloak),
partidas e listas de presença — útil pra testar o app com vários acessos
simultâneos (vários dispositivos/abas logados como pessoas diferentes).

**Precisa da stack local rodando** (`npm run stack:up` ou API + Keycloak de pé).
Não roda neste ambiente cloud (sem Docker/Keycloak aqui) — é pra rodar na sua
máquina.

## Uso

```powershell
$env:SEED_ORGANIZER_EMAIL = "seu-email@exemplo.com"
$env:SEED_ORGANIZER_PASSWORD = "sua-senha"
$env:SEED_PELADA_ID = "id-da-pelada"   # veja na URL do app ao abrir a pelada
npm.cmd run seed:test-users
```

O organizador precisa ser o organizador **daquela pelada** (ou ter permissão
de criar convite e partidas nela). O `SEED_PELADA_ID` é o `id` da pelada —
a forma mais fácil de achar é abrir o DevTools na aba Rede ao usar o app e
ver a URL das chamadas `/peladas/<id>/...`.

### Variáveis opcionais

| Variável | Padrão | O que faz |
|---|---|---|
| `SEED_USER_COUNT` | `50` | quantos usuários de teste criar |
| `SEED_MATCH_COUNT` | `4` | quantas partidas criar (datas futuras, 1 por semana) |
| `SEED_ATTENDANCE_RATE` | `0.7` | fração dos usuários marcados como presentes em cada partida |
| `SEED_PASSWORD` | `Teste@12345` | senha única pra todos os usuários de teste |
| `SEED_API_URL` | `http://localhost:3000` | base da API |

## O que o script faz

1. Cadastra `SEED_USER_COUNT` contas no Keycloak via `POST /register`
   (e-mails `jogador-teste-01@pelada-teste.local`, `...-02@...`, etc., todas
   com a mesma senha). Rodar de novo é seguro — conta já existente é só
   pulada (409 tratado como sucesso).
2. Faz login de cada uma (grant de senha direto no Keycloak).
3. Entra na pelada via convite (cria 1 convite por usuário, resgata na hora).
4. Promove cada uma de Convidado pra Jogador fixo, pra ficarem disponíveis
   no sorteio como qualquer jogador normal.
5. Cria as partidas (metade no modo "organizador fecha lista", metade no
   modo "jogador confirma", alternadas).
6. Marca presença confirmada de `SEED_ATTENDANCE_RATE` dos usuários em cada
   partida (via autoconfirmação nas partidas "jogador confirma", e via
   organizador nas "organizador fecha lista").

**Cadastro é limitado a 8 contas por minuto** (throttle do `POST /register`
— ver `apps/api/src/register/register.controller.ts`), então pra 50 usuários
o script pausa ~65s entre lotes de 8. Para 50 usuários isso leva uns
6-7 minutos só nessa etapa.

Ao final, grava a lista de e-mails/senhas/ids em
`.seed-output/test-users-<timestamp>.json` (gitignored — não é commitado) e
imprime no terminal a senha única e o caminho do arquivo.

## Limpeza

Não há script de limpeza automática ainda. Pra remover: deletar os jogadores
na tela "Elenco" da pelada (isso não some com as contas Keycloak, só com o
vínculo na pelada), ou, via admin console do Keycloak, deletar os usuários
`jogador-teste-*@pelada-teste.local` diretamente.
