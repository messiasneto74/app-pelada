/** Checklist §3.1 estados vazios (issue #23) — aceite manual + PR. */
export interface InicioEmptyScreenChecklistItem {
  id: string;
  label: string;
  automated: boolean;
}

export const INICIO_EMPTY_SCREEN_CHECKLIST: InicioEmptyScreenChecklistItem[] = [
  { id: 'no-match', label: 'Card “Nenhuma partida marcada” + CTA criar partida', automated: true },
  { id: 'no-roster', label: 'Card “Elenco vazio” + CTA ir para elenco', automated: true },
  { id: 'shortcuts', label: 'Atalhos §3.1 visíveis abaixo dos cards vazios', automated: true },
  { id: 'cash', label: 'Resumo caixa do mês (zerado) sem quebrar layout', automated: true },
  { id: '390', label: 'Layout 390×844 — screenshot no PR', automated: false },
];
