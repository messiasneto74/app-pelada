/** Checklist T6 / história 84 — aceite manual + itens verificáveis no app. */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

export const MOBILE_TOUCH_MIN_PX = 44;

export interface MobileUxChecklistItem {
  id: string;
  label: string;
  /** Verificável por tokens/CSS ou teste unitário. */
  automated: boolean;
}

export const MOBILE_UX_CHECKLIST: MobileUxChecklistItem[] = [
  {
    id: 'viewport-390',
    label: 'Shell e conteúdo limitados a 390px (referência Resenha)',
    automated: true,
  },
  {
    id: 'touch-44',
    label: 'Botões e abas com alvo mínimo de 44px',
    automated: true,
  },
  {
    id: 'bottom-nav',
    label: 'Navegação principal na barra inferior (4 abas)',
    automated: true,
  },
  {
    id: 'safe-area',
    label: 'Safe area inferior respeitada (notch / home indicator)',
    automated: true,
  },
  {
    id: 'few-taps',
    label: 'Fluxos principais com poucos toques (validar manualmente nas telas 3.x)',
    automated: false,
  },
  {
    id: 'serve-390',
    label: 'Testar em DevTools 390×844 ou dispositivo real',
    automated: false,
  },
];
