/** Checklist L1 — lacuna spec §4 / história 1 (aceite manual + campos na tela). */
export interface L1ScreenChecklistItem {
  id: string;
  label: string;
  automated: boolean;
}

export const L1_SCREEN_CHECKLIST: L1ScreenChecklistItem[] = [
  { id: 'nome', label: 'Campo nome da pelada', automated: true },
  { id: 'foto', label: 'Upload de foto (opcional, JPG/PNG/WebP)', automated: true },
  { id: 'dia', label: 'Dia habitual da semana', automated: true },
  { id: 'local', label: 'Local padrão', automated: true },
  { id: 'antes-inicio', label: 'Fluxo antes do Início (onboarding)', automated: true },
  { id: '390', label: 'Layout 390px — screenshot no PR', automated: false },
];
