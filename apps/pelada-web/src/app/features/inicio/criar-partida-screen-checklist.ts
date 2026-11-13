/** Checklist §3.3 — aceite manual + PR (#28). */
export interface CriarPartidaChecklistItem {
  id: string;
  label: string;
  automated: boolean;
}

export const CRIAR_PARTIDA_CHECKLIST: CriarPartidaChecklistItem[] = [
  { id: 'datetime', label: 'Data, hora e local da partida', automated: true },
  { id: 'notes', label: 'Observações opcionais', automated: true },
  { id: 'presence', label: 'Modo de presença selecionável', automated: true },
  { id: 'rules', label: 'Resumo das regras padrão da pelada', automated: true },
  { id: '390', label: 'Layout 390×844 — screenshot no PR', automated: false },
];
