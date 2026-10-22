# App de Pelada — Especificação das telas do MVP

Documento de apoio para criar as issues. Cada tela traz: histórias de usuário relacionadas, o que aparece, ações, regras e critérios de aceite. Os IDs de história vêm do documento de histórias de usuário (MVP).

## 1. Visão geral e navegação

O app usa uma **barra inferior com 4 abas**: Início, Partida, Jogadores e Caixa. Cada aba abre um fluxo.

| Aba | Telas do fluxo |
| --- | --- |
| Início | Início, Regras da pelada, Criar partida |
| Partida | Presença, Sorteio, Em campo |
| Jogadores | Lista de jogadores, Perfil do jogador |
| Caixa | Caixa (pagamentos) |

Fluxo principal de uma partida: **Criar partida → Presença → Fechar lista → Sorteio → Em campo → Caixa**.

## 2. Issues transversais (fazer antes das telas)

**Referência visual obrigatória:** protótipo [Resenha](prototipo/index.html) e [galeria de 16 telas](prototipo/visual/README.md). Tokens, componentes e estados devem seguir [docs/ui-referencia-resenha.md](docs/ui-referencia-resenha.md) (prevalece sobre wireframes antigos).

| # | Issue | Descrição |
| --- | --- | --- |
| T1 | Tema e design tokens | Como em `prototipo/styles.css` e na galeria: verde `#173d32`, lime `#dcf58a`, Barlow Condensed + DM Sans, escala de espaçamentos e raios. |
| T2 | Componentes base | Card, Chip de status (verde, amarelo, vermelho, neutro), Avatar com iniciais, Barra de progresso, Interruptor, Controle segmentado, Campo de formulário, Botão primário e secundário (altura mínima de 44 px). |
| T3 | Navegação | Barra inferior com 4 abas e ícones, rotas das telas e estado da aba ativa. |
| T4 | Cabeçalho de tela | Rótulo pequeno, título grande e ação opcional à direita. |
| T5 | Modelo de dados | Pelada, Jogador, Partida, Presença, Time, Pagamento e Regras (padrão do grupo e exceção por partida). |
| T6 | UX no celular (história 84) | Poucos toques, alvos grandes e teste em tela de 390 px. |

## 3. Telas

### 3.1 Início

**Histórias:** 1, 8, 32.

**O que aparece**

- Card de destaque da próxima partida: dia, hora, local, modalidade, vagas (ex.: 12/14), avatares dos confirmados e barra de progresso.
- Botão "Abrir lista de presença".
- Grade de atalhos: Criar partida, Regras, Elenco, Cobrar.
- Resumo do caixa do mês (recebido de total, em %).

**Ações**

- Abrir a presença da próxima partida.
- Ir para Criar partida, Regras, Jogadores e Caixa pelos atalhos.

**Estados**

- Sem partida marcada: mostrar convite para criar a primeira partida.
- Sem jogadores: mostrar convite para adicionar o elenco.

**Critérios de aceite**

- [ ] A próxima partida mostra dados reais da pelada.
- [ ] A barra de vagas reflete confirmados sobre vagas.
- [ ] Cada atalho leva à tela correta.

### 3.2 Regras da pelada

**Histórias:** 2, 3, 4, 5, 6, 7, 8, 9, 10, 16.

**O que aparece, em seções**

- **Formato:** jogadores de linha por time, times no sorteio (2 a 6), modalidade (futsal, society, campo).
- **Goleiro:** um goleiro por time (interruptor), goleiro fixo no gol (interruptor).
- **Presença e pagamento:** jogadores fixos na lista (interruptor), modelo de pagamento (por jogo, semanal, quinzenal, mensal).
- **Sorteio:** modo (equilibrado, aleatório, manual), usar nota e atributos, usar tags de estilo.
- Botão "Salvar como padrão".

**Ações**

- Editar cada regra e salvar como padrão do grupo.
- Ajustar uma regra só para uma partida (exceção), sem mudar o padrão.

**Regras**

- Goleiro por time e goleiro fixo não podem ficar ligados ao mesmo tempo.
- Se goleiro fixo estiver ligado, perguntar se ele troca de time (por resultado, por lado ou só manual pelo adm).
- "Fixos na lista" só habilita a marcação de fixos se estiver ligado.

**Critérios de aceite**

- [ ] As regras salvas viram o padrão de toda nova partida.
- [ ] Uma exceção vale só para a partida em que foi feita.
- [ ] Combinações inválidas de goleiro são bloqueadas com mensagem clara.

### 3.3 Criar partida

**Histórias:** 32, 33.

**O que aparece**

- Campos: data, hora, local (com local padrão da pelada), observações.
- Controle segmentado do modo de presença: adm marca, jogador confirma, lista "vou" (o link público fica para depois).
- Interruptor "Usar regras padrão" com resumo das regras.
- Botão "Criar partida".

**Regras**

- Se "Usar regras padrão" estiver desligado, abrir a edição de regras só desta partida.
- Data e hora são obrigatórias.

**Critérios de aceite**

- [ ] A partida criada aparece como próxima partida no Início.
- [ ] O modo de presença escolhido muda o comportamento da tela de Presença.

### 3.4 Presença

**Histórias:** 33, 35, 36, 38, 42, 43, 44.

**O que aparece**

- Resumo de vagas (ex.: 12 de 14) com barra e chip da fila.
- Controle segmentado: Confirmados, Pendentes, Fila.
- Lista de jogadores com avatar, nome, posição e chip de status (Confirmou, Sem resposta).
- Linha de convidado com botões Aceitar e Recusar.
- Botão "Fechar lista e sortear".

**Ações**

- Adm marca ou desmarca presença de um jogador.
- Jogador confirma ou recusa, conforme o modo escolhido.
- Convidado pede para entrar; adm aceita ou recusa.
- Adm fecha a lista quando quiser.

**Regras**

- Jogadores fixos (se habilitados) entram com prioridade.
- Acima das vagas, o jogador vai para a fila.
- Depois de fechar a lista, ninguém altera a presença sem o adm reabrir.

**Critérios de aceite**

- [ ] Os números de confirmados, pendentes e fila atualizam na hora.
- [ ] Fechar a lista leva ao Sorteio com os confirmados.
- [ ] Convidado só entra depois da aprovação.

### 3.5 Sorteio

**Histórias:** 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 58, 61.

**O que aparece**

- Card de equilíbrio: percentual, barra comparando os times e frase de diferença entre as médias.
- Um card por time: nome, média, lista de jogadores com alça de arrastar, avatar, posição e nota.
- Dica "Segure e arraste um jogador para trocar de time".
- Botões "Sortear de novo" e "Compartilhar".

**Ações**

- Sortear equilibrado em um toque, ou aleatório se esse for o modo.
- Arrastar jogador entre times e ver o equilíbrio recalcular na hora.
- Fixar um time e sortear de novo só o resto.
- Compartilhar os times em texto ou imagem, com opção de ocultar as notas.

**Regras**

- No modo goleiro por time, cada time recebe um goleiro, distribuídos de forma justa.
- No modo goleiro fixo, os goleiros ficam fora do sorteio da linha.
- O cálculo usa nota, atributos, tags e posições conforme as regras do sorteio.

**Critérios de aceite**

- [ ] Nenhum time fica sem goleiro quando a regra exige.
- [ ] A diferença entre as médias e o percentual de equilíbrio são recalculados após cada troca.
- [ ] O texto compartilhado pode sair sem as notas.

### 3.6 Em campo

**Histórias:** 63, 64, 65, 66.

**O que aparece**

- Placar grande dos dois times em campo, cronômetro e barra do tempo.
- Quem descansa e o aviso de quem entra em seguida.
- Botões "+1 Time A", "+1 Time B" e "Encerrar jogo".
- Política de rodízio no cabeçalho (ex.: ganha fica).

**Ações**

- Iniciar, pausar e encerrar o cronômetro.
- Marcar gol para cada lado.
- Ao encerrar, aplicar o rodízio e mostrar quais times jogam em seguida.

**Regras**

- Políticas de rodízio: descanso, ganha fica, A×B depois B×C, e outras combinadas.
- Com goleiro fixo que troca por resultado, mostrar em qual time e lado ele está depois de cada jogo.

**Critérios de aceite**

- [ ] O rodízio coloca em campo os times certos conforme a política escolhida.
- [ ] O placar e o cronômetro continuam corretos se o app for minimizado.

### 3.7 Jogadores

**Histórias:** 23, 24, 26 (lista), 44.

**O que aparece**

- Contagem do elenco no cabeçalho e campo de busca.
- Controle segmentado: Todos, Goleiros, Linha.
- Lista com avatar, nome, posição, tags e nota geral.
- Botão "+ Adicionar jogador".

**Ações**

- Buscar e filtrar.
- Abrir o perfil de um jogador.
- Adicionar jogador e marcar como fixo na lista, se a regra estiver ligada.

**Critérios de aceite**

- [ ] A busca filtra por nome.
- [ ] A nota exibida é a mesma usada no sorteio.

### 3.8 Perfil do jogador

**Histórias:** 23, 24, 26, 27.

**O que aparece**

- Avatar grande, nome, posição e nota geral.
- Tags de estilo (ex.: driblador, chuta bem, corredor).
- Atributos em barras: técnica, força, chute, passe, defesa, velocidade.
- Plano de pagamento do jogador (ex.: mensal).
- Botão "Editar perfil (adm)".

**Regras**

- Só o adm edita nota e atributos, a menos que a regra permita que o jogador edite o próprio perfil.
- A posição preferida (goleiro, defesa, meio, ataque) é usada no sorteio.

**Critérios de aceite**

- [ ] Alterar a nota ou um atributo muda o resultado do próximo sorteio.
- [ ] Jogador sem permissão não vê o botão de editar.

### 3.9 Caixa

**Histórias:** 14, 15, 17 (e 18 como "depois").

**O que aparece**

- Card com valor recebido, barra de progresso e quanto falta.
- Controle segmentado: Por jogador, Por partida.
- Lista com chip Pago ou Devendo e o plano de cada jogador.
- Botões "Marcar pago" e "Cobrança Zap".

**Ações**

- Adm marca um pagamento como pago.
- Ver quem deve, por período (partida, semana, quinzena ou mês, conforme o modelo escolhido).
- A cobrança pelo WhatsApp (texto com valor, devedores e chave Pix) fica para depois do MVP. No MVP o botão pode aparecer desativado ou escondido.

**Regras**

- Não há pagamento automático dentro do app: é cobrança assistida, e o adm marca como pago.
- O plano do jogador (por jogo ou mensal) define quem está coberto.

**Critérios de aceite**

- [ ] Marcar pago atualiza o total recebido e o resumo no Início.
- [ ] A lista respeita o modelo de pagamento da pelada.

## 4. Lacunas encontradas nas telas

Estas histórias do MVP ainda não têm tela ou controle. Sugiro abrir uma issue para cada uma:

| Lacuna | Histórias | Sugestão |
| --- | --- | --- |
| Criar pelada (nome, foto, dia habitual, local padrão) | 1 | Tela de primeiro acesso, antes do Início. |
| Sugestões de formato quando vier mais ou menos gente | 45 | Aviso na Presença antes de fechar a lista. |
| Quem edita o perfil (jogador ou só adm) | 27 | Interruptor na tela de Regras. |
| Rankings, cronômetro avançado e gols por jogador | 67, 71 e 72 | Fora do MVP. |

## 5. Ordem sugerida

1. **Base:** T1 a T6.
2. **Pelada e regras:** Criar pelada, Regras, Início.
3. **Elenco:** Jogadores e Perfil.
4. **Partida:** Criar partida e Presença.
5. **Sorteio:** o maior risco técnico, por causa do cálculo de equilíbrio e do arrastar e soltar; vale começar cedo com um protótipo.
6. **Em campo e Caixa.**

## 6. Fora do MVP (marcadas como "Depois")

Convite por link ou QR **para entrar no grupo** (hist. 11), mais de um adm, partidas recorrentes, cobrança no WhatsApp com Pix (hist. 18), caixa com entradas e saídas, fila automática, notificações, gols e assistências, rankings, histórico, copa, integração com WhatsApp e uso offline.

**No MVP entram:** aprovar convidado na presença (42–43) e fluxo de presença da partida — ver issues `3.4` / `3.4-API`, não confundir com convite de grupo (11).

## 7. Plano de execução

Issues, fases, milestones e sprints: [docs/plano-issues-fases-milestones.md](docs/plano-issues-fases-milestones.md).
