/** Checklist §3.7 — aceite manual + PR (#24). */
export interface JogadoresScreenChecklistItem {
  id: string;
  label: string;
  automated: boolean;
}

export const JOGADORES_SCREEN_CHECKLIST: JogadoresScreenChecklistItem[] = [
  { id: 'count', label: 'Contagem do elenco no cabeçalho', automated: true },
  { id: 'search', label: 'Busca filtra por nome', automated: true },
  { id: 'segment', label: 'Segmentos Todos / Goleiros / Linha', automated: true },
  { id: 'row', label: 'Lista com avatar, posição, tags e nota', automated: true },
  { id: 'profile', label: 'Linha abre perfil (/jogadores/:id)', automated: true },
  { id: 'add', label: 'Botão + Adicionar jogador visível', automated: true },
  { id: '390', label: 'Layout 390×844 — screenshot no PR', automated: false },
];
