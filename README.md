# App de Pelada

Projeto com **protótipo interativo Resenha** e documentação de planejamento (histórias, telas MVP, arquitetura, issues).

## Documentação

- [Histórias de usuário](historias-de-usuarios.md)
- [Telas MVP](App%20de%20Pelada%20—%20Especificação%20das%20telas%20do%20MVP.md)
- [Referência visual (Resenha → Angular T1–§3.x)](docs/ui-referencia-resenha.md)
- [Arquitetura](docs/arquitetura-backend-frontend.md)
- [Publicação web + Play Store + App Store](docs/publicacao-lojas-play-app-store.md)
- [Plano de issues / fases / milestones](docs/plano-issues-fases-milestones.md)
- [Estratégia de testes e DoD](docs/estrategia-testes.md)
- [Desenvolvimento e testes na sua máquina](docs/desenvolvimento-local.md)
- [Processo de testes (você + agente Cursor)](docs/processo-testes-e-qualidade.md)

O monorepo Angular + API + `packages/core` **ainda não está neste repositório** — será criado issue a issue conforme o plano.

## Protótipo Resenha

Nova interface responsiva com navegação, partidas, presença e fila, sorteio, placar, elenco e caixa. Os dados são salvos neste navegador; ainda não há backend ou sincronização. Veja [como rodar e testar](prototipo/README.md).

### Galeria (telas refeitas)

**[16 telas e estados — mobile 390px e desktop](prototipo/visual/README.md)**

[Prints mobile](prototipo/visual/mobile) · [Prints desktop](prototipo/visual/desktop)

[![Painel do Resenha](prototipo/novo-visual.png)](prototipo/visual/desktop/inicio.png)

Implementação Angular: espelhar layout e tokens desta galeria ([mapa completo](docs/ui-referencia-resenha.md)).
