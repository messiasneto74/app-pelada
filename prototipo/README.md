# Resenha — protótipo interativo

Interface responsiva para organizar a pelada, com HTML, CSS e JavaScript sem dependências em produção.

## Rodar

A partir de `prototipo/`, execute:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Também é possível usar `npm run dev`. O servidor deve servir esta pasta; não é necessário instalar pacotes para usar o app. Requer Python 3. Os arquivos podem ser hospedados em um servidor estático.

## O que funciona

- Painel com próxima partida, presenças, atalhos e resumo do caixa.
- Agenda e criação de partidas com data, horário, local e recado.
- Confirmação de presença, capacidade, fila por ordem de entrada e promoção automática quando há vaga.
- Fechamento e reabertura da lista. Reabrir limpa times e placar após confirmação.
- Sorteio por nota e tamanho, com um goleiro por time (2 a 6 times). A nota é uma heurística; não há otimização por atributos ou estilo. A ordem de entrada na fila é preservada.
- Troca entre jogadores de equipes diferentes; goleiros só trocam com goleiros. O equilíbrio é recalculado. O início do jogo bloqueia novos sorteios e trocas.
- Compartilhamento de texto sem notas, com cópia manual quando a área de transferência está indisponível.
- Placar, desfazer último gol, cronômetro persistente e rodízio “ganha fica”; em empate, o time à esquerda descansa.
- Cadastro, busca, filtros e edição de nome, posição e nota do elenco.
- Contribuição por jogador, registro manual de pagamento, desfazer e lembrete para copiar.
- Configurações do grupo e padrões para novas partidas; exportação dos dados em JSON.
- Navegação por hash, suporte a teclado, janelas com foco contido e navegação inferior no celular.

## Dados e limites

O primeiro acesso abre uma pelada de exemplo com 18 jogadores. As alterações são salvas na chave `resenha-v1` do `localStorage` deste navegador. Os dados não são compartilhados entre dispositivos, usuários ou endereços de hospedagem. Limpar os dados do site remove o estado; exporte uma cópia antes. Não há importação do backup nesta versão.

Esta versão não implementa login, permissões reais, backend, pagamento online nem convite público por link. Você atua como organizador. O caixa representa um único período manual; não há histórico financeiro por mês/partida. O valor exibido usa a contribuição atual do grupo. As mensagens de convite são textos para enviar por fora do app.

As fontes Google são opcionais: se não carregarem, a interface usa fontes do sistema. O restante da aplicação usa apenas arquivos locais. O cronômetro mede o tempo pela hora do dispositivo, inclusive após trocar de tela ou recarregar; alterações manuais no relógio podem afetá-lo.

## Validar

Requer Node.js 18+ e Python 3. Instale as dependências de desenvolvimento:

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

Quando `/usr/bin/chromium` existe, a configuração de testes o usa automaticamente; a instalação pelo Playwright é dispensável. Outra localização pode ser informada com `CHROMIUM_PATH`.

A suíte executa os fluxos no Chromium em desktop e com viewport/dispositivo móvel emulado. Não equivale a teste em Safari/iPhone físico. Inicia seu próprio servidor na porta 8001; deixe essa porta livre. Os testes usam contextos isolados e não alteram os dados do seu navegador.
