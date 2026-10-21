# Histórias de usuário — app de pelada

Documento para validação. Marque na coluna **Validação**: `ok` | `mvp` | `depois` | `tirar` | `ajustar`.

**Arquitetura (backend, frontend, rotas e navegação):** [docs/arquitetura-backend-frontend.md](docs/arquitetura-backend-frontend.md)

**Especificação de telas MVP:** [App de Pelada — Especificação das telas do MVP.md](App%20de%20Pelada%20—%20Especificação%20das%20telas%20do%20MVP.md)

**Plano (issues / fases / milestones):** [docs/plano-issues-fases-milestones.md](docs/plano-issues-fases-milestones.md)

## Papéis e status

| Tipo | Descrição |
|------|-----------|
| **Organizador** | Adm da pelada |
| **Jogador** | Joga na linha (pode ter papel de goleiro em algumas partidas) |
| **Goleiro** | Quando a história é específica do modo goleiro |
| **Convidado** | Status na partida (não é um “tipo de conta”) |

**Status na partida:** convidado · fixo na lista (se adm habilitar) · fila · afastado/machucado

**Regras da pelada vs sorteio**

| Conceito | O que cobre |
|----------|-------------|
| **Regras da pelada** | Formato, goleiro, presença, pagamento, rodízio, fixos na lista |
| **Regras do sorteio** | Equilibrado/aleatório/manual, pesos (nota, atributos, tags), posições, GK no sorteio ou não |

---

## O que é “Pix” neste app? (história 18)

**Não é** (no escopo inicial) pagamento automático dentro do app tipo banco ou Chega+ com carteira integrada.

**É** **cobrança assistida** para a rotina real da pelada:

1. Organizador cadastra a **chave Pix do caixa** da pelada (CPF, e-mail, telefone ou aleatória).
2. App calcula **quem deve quanto** (por jogo, semana, quinzena ou mês — histórias 14–17).
3. App gera **texto pronto para WhatsApp**: valor, nome de quem falta pagar, chave Pix (e opcionalmente **QR estático** ou “copiar chave”).
4. Jogador paga no **app do banco dele** (Pix manual).
5. Organizador **marca como pago** no app (controle de caixa).

**Fase futura (opcional):** Pix com QR **dinâmico** por cobrança ou integração com gateway — história separada se vocês quiserem.

---

## A. Grupo e regras da pelada

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 1 | organizador | criar a pelada (nome, foto, dia habitual, local padrão) | ter um lugar único do nosso racha | MVP | |
| 2 | organizador | definir quantos jogadores de linha cada time usa (5, 6, 7…) | refletir “pelada de 6” e variações | MVP | |
| 3 | organizador | definir quantos times o sorteio forma (2 a 6) | ex.: 21 jogadores em 3 times | MVP | |
| 4 | organizador | escolher modalidade (futsal, society, campo) e tamanho habitual | alinhar vagas e expectativa | MVP | |
| 5 | organizador | ter a opção de um goleiro por time (GK fora da linha) | peladas com GK em cada time | MVP | |
| 6 | organizador | ter a opção de goleiros fixos no gol (linha sorteia/roda à parte) | mesmos no gol sempre | MVP | |
| 7 | organizador | ter a opção de definir se o GK fixo troca de time (resultado / lado / só adm manual) | copiar como jogamos | MVP | |
| 8 | organizador | salvar regras da pelada como padrão do grupo | não reconfigurar toda semana | MVP | |
| 9 | organizador | ajustar só nesta partida regras que são padrão | exceções (chuva, menos gente) | MVP | |
| 10 | organizador | definir regras do sorteio (modo, pesos, atributos, tags, posições) | balanceamento do nosso jeito | MVP | |
| 11 | organizador | convidar jogadores por link ou QR | entrada no grupo da pelada | Depois | |
| 12 | organizador | ter mais de um adm na mesma pelada | dividir organização | Depois | |
| 13 | organizador | partidas recorrentes (ex.: toda terça 19h) | não criar jogo manualmente | Depois | |

---

## B. Pagamento e elenco

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 14 | organizador | configurar modelo de pagamento: por jogo, semanal, quinzenal ou mensal | refletir como cobramos o campo | MVP | |
| 15 | organizador | marcar plano de pagamento por jogador (ex.: mensal vs por jogo) | saber quem está “coberto” | MVP | |
| 16 | organizador | opcionalmente habilitar “jogador fixo na lista” (só se eu ativar) | prioridade no elenco sem tipo especial de usuário | MVP | |
| 17 | organizador | ver quem pagou e quem está devendo (partida ou período) | fechar o caixa | MVP | |
| 18 | organizador | gerar cobrança para WhatsApp com valor, devedores e chave Pix (cobrança assistida; ver nota acima) | não cobrar um por um na mão | Depois | |
| 19 | organizador | ter a opção de goleiro isento de pagamento | quando combinamos no grupo | Depois | |
| 20 | organizador | caixa da pelada (entradas/saídas: campo, bola, etc.) | substituir planilha | Depois | |
| 21 | organizador | bloquear ou alertar inadimplente na presença (se eu ativar) | aplicar regra combinada | Depois | |
| 22 | organizador | valor diferente para convidado (se configurado) | convidado paga mais ou menos | Depois | |

---

## C. Perfil — nível, atributos e tags

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 23 | organizador | cadastrar nota geral e atributos (técnica, força, chute, passe, defesa, velocidade…) | sorteios justos em pelada “pegada” | MVP | |
| 24 | organizador | marcar tags de estilo (pesado, corredor, driblador, chuta bem, etc.) | pelada mais tranquila / resenha | MVP | |
| 25 | organizador | escolher o que entra no sorteio (nota, atributos, tags, pesos) | pelada tranquila vs competitiva | MVP | |
| 26 | organizador | definir posição preferida por jogador (GK, defesa, meio, ataque) | equilibrar funções no campo | MVP | |
| 27 | organizador | decidir se jogadores editam o próprio perfil; se não, só adm altera | evitar nota inflada | MVP | |
| 28 | jogador | ver meu perfil na pelada (foto, posição, stats) | acompanhar participação | Depois | |
| 29 | organizador | importar nomes colando lista do WhatsApp | montar elenco rápido | Depois | |
| 30 | organizador | salvar listas/elenco favorito e reutilizar | não redigitar todo jogo | Depois | |
| 31 | organizador | marcar jogador afastado/machucado e liberar quando autorizar | não entrar no sorteio lesionado | Depois | |

---

## D. Partida e presença

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 32 | organizador | criar a partida (data, hora, local, observações) | grupo saber onde e quando | MVP | |
| 33 | organizador | escolher como a presença funciona (adm marca; jogador confirma nome; “vou” na lista; link público…) | encaixar no jeito de cada grupo | MVP | |
| 34 | organizador | link pessoal por jogador (cada um só confirma em seu nome) | ninguém marcar pelo outro | Depois | |
| 35 | jogador | confirmar ou recusar presença no modo configurado | aparecer na lista oficial | MVP | |
| 36 | organizador | ver vagas, confirmados, sem resposta e fila em tempo real | fechar lista | MVP | |
| 37 | organizador | definir prazo para confirmar (vaga guardada até X horas) | não segurar vaga sem resposta | Depois | |
| 38 | organizador | fechar a lista manualmente quando quiser | sortear com lista travada | MVP | |
| 39 | organizador | fila de espera automática quando lotar, com aviso de quem subiu | substituir desistente | Depois | |
| 40 | organizador | notificar só quem ainda não respondeu | não spammar quem já confirmou | Depois | |
| 41 | organizador | enviar resumo da lista para o WhatsApp | grupo ver sem abrir o app | Depois | |
| 42 | convidado | pedir para entrar na partida ou na fila | jogar quando adm aceitar ou abrir vaga | MVP | |
| 43 | organizador | aprovar ou recusar convidado | controlar quem entra de fora | MVP | |
| 44 | organizador | marcar jogadores fixos no elenco (se 16 ativo) com prioridade conforme regra | quem sempre joga não ficar de fora | MVP | |
| 45 | organizador | sugestões de formato quando vier mais ou menos gente que o ideal | decidir antes do sorteio | MVP | |
| 46 | organizador | ordem de chegada na lista (se ativar) | priorizar quem chegou primeiro no campo | Depois | |

---

## E. Sorteio e equilíbrio

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 47 | jogador | times equilibrados em nível | partida disputada e justa | MVP | |
| 48 | jogador | ver média ou força de cada time após o sorteio | confiar no resultado | MVP | |
| 49 | jogador | ver resumo simples do equilíbrio | entender sem fórmula | MVP | |
| 50 | organizador | sortear times equilibrados em um toque (lista confirmada) | acabar discussão | MVP | |
| 51 | organizador | ter a opção de sorteio aleatório | resenha | MVP | |
| 52 | organizador | montar times manualmente com indicador de equilíbrio | controle total | Depois | |
| 53 | organizador | regerar sorteio ou fixar um time e regerar o resto | ajustar atrasado/combinado | MVP | |
| 54 | organizador | arrastar jogador entre times e ver equilíbrio mudar | correções na hora | MVP | |
| 55 | organizador | indicador de equilíbrio (score) ao sortear | mostrar que foi calculado | MVP | |
| 56 | organizador | garantir um goleiro por time no modo “GK por time” | não sortear time sem GK | MVP | |
| 57 | goleiro | no modo GK por time, ser distribuído de forma justa entre times | não concentrar GK forte num time só | MVP | |
| 58 | goleiro | no modo fixo, não entrar no sorteio da linha | continuar no gol | MVP | |
| 59 | organizador | separar dois jogadores no sorteio (não jogam juntos) | evitar combinação ruim | Depois | |
| 60 | organizador | repetir último sorteio ou carregar histórico | remarcar rápido | Depois | |
| 61 | organizador | compartilhar times (WhatsApp, imagem, texto) com opção de ocultar níveis | grupo ver sem expor nota | MVP | |
| 62 | organizador | modos avançados (por posição, mercado de notas, sugestão por histórico) | evoluir sem refazer app | Depois | |

---

## F. Em campo

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 63 | jogador | saber quais 2 times estão em campo e quem descansa | não me perder | MVP | |
| 64 | organizador | escolher política de rodízio (descanso, ganha fica, A×B, B×C…) | seguir nossa pelada | MVP | |
| 65 | goleiro | com troca por resultado, ver em qual time/lado estou após cada jogo | clareza na quadra | MVP | |
| 66 | organizador | cronômetro e placar | marcar o jogo | MVP | |
| 67 | organizador | registrar gol e assistência (toque ou voz) | não parar o jogo | Depois | |
| 68 | organizador | rotação automática da fila (quem entra/sai) | muitos no banco | Depois | |
| 69 | organizador | definir cor/nome do time na partida | saber qual camisa levar | Depois | |
| 70 | jogador | acompanhar placar ao vivo no celular | banco acompanhar o jogo | Depois | |

---

## G. Depois do jogo

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 71 | jogador | artilharia, assistências, vitórias e jogos | ranking entre amigos | Depois | |
| 72 | organizador | rankings automáticos (artilheiro, assistências, MVP, presença) | zerar planilha | Depois | |
| 73 | jogador | prêmios divertidos do dia (craque, matador, maestro…) | resenha pós-jogo | Depois | |
| 74 | organizador | nota de desempenho evoluindo (gols, vitórias, frequência) | melhorar nível do sorteio | Depois | |
| 75 | jogador | votar MVP ou destaques | reconhecer quem jogou bem | Depois | |
| 76 | jogador | histórico de partidas e confrontos | lembrar resultados | Depois | |
| 77 | organizador | criar copa ou mata-mata no grupo | eventos especiais | Depois | |
| 78 | organizador | registrar cartão ou advertência | jogo mais sério | Depois | |

---

## H. WhatsApp, confiabilidade e experiência

| ID | Como | Quero | Para | Fase sugerida | Validação |
|----|------|-------|------|---------------|-----------|
| 79 | organizador | comandos ou integração no grupo (/lista, /times, /próxima) | consultar sem abrir app | Depois | |
| 80 | organizador | ver confiabilidade de presença (confirmou e foi) | planejar com quem aparece | Depois | |
| 81 | organizador | marcar quem faltou sem avisar | histórico e regras do grupo | Depois | |
| 82 | jogador | entrar pela web/link sem instalar app (se adm permitir) | menos fricção | Depois | |
| 83 | organizador | usar offline no campo (lista/sorteio) e sincronizar depois | internet ruim na quadra | Depois | |
| 84 | jogador | interface simples no celular, poucos toques | usar no campinho | MVP | |
| 85 | organizador | enquete (muda dia? chove?) | decisão fora do Zap perdido | Depois | |
| 86 | organizador | previsão do tempo no local | avisar se alaga | Depois | |
| 87 | jogador | perfil público só com dados de jogo (sem telefone) | compartilhar com segurança | Depois | |
| 88 | jogador | sincronizar partida no calendário | não esquecer | Depois | |

---

## Decisões já tomadas (não incluir como história)

| Item | Decisão |
|------|---------|
| Society sem goleiro dedicado | Não existe para o nosso público |
| Personas “avulso” / “mensalista” | Não — pagamento é config; pessoa é jogador/goleiro/organizador |
| Ficar no mesmo time que amigo | Não |
| Marketplace / descobrir jogos na cidade | Fora do foco inicial |

---

## Rascunho de MVP (ajuste na coluna Validação)

| Área | IDs |
|------|-----|
| Grupo e sorteio | 1–10, 47–51, 53–58, 61 |
| Perfil | 23–27 |
| Presença | 32–33, 35–36, 38, 42–45 |
| Campo | 63–66 |
| Pagamento básico | 14–17 (sem Pix automático; 18 depois) |
| UX | 84 |
