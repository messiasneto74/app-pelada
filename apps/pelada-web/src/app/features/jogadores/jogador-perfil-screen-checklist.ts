/** Checklist §3.8 — aceite manual + PR (#26). */
export interface JogadorPerfilChecklistItem {
  id: string;
  label: string;
  automated: boolean;
}

export const JOGADOR_PERFIL_CHECKLIST: JogadorPerfilChecklistItem[] = [
  { id: 'hero', label: 'Avatar, nome, posição e nota geral', automated: true },
  { id: 'tags', label: 'Tags de estilo visíveis', automated: true },
  { id: 'attrs', label: 'Barras de atributos (6 eixos)', automated: true },
  { id: 'pay', label: 'Plano de pagamento do jogador', automated: true },
  { id: 'edit', label: 'Botão editar só para quem tem permissão', automated: true },
  { id: '390', label: 'Layout 390×844 — screenshot no PR', automated: false },
];
