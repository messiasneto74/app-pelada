/** Checklist §3.4 — aceite manual + PR (#30). */
export interface PresencaScreenChecklistItem {
  id: string;
  label: string;
  automated: boolean;
}

export const PRESENCA_SCREEN_CHECKLIST: PresencaScreenChecklistItem[] = [
  { id: 'vacancy', label: 'Resumo de vagas com barra e chip da fila', automated: true },
  { id: 'segment', label: 'Segmentos Confirmados / Pendentes / Fila', automated: true },
  { id: 'list', label: 'Lista com avatar, nome, posição e chip de status', automated: true },
  { id: 'guest', label: 'Linha de convidado com Aceitar e Recusar', automated: true },
  { id: 'close', label: 'Botão Fechar lista e sortear', automated: true },
  {
    id: 'l45-format',
    label: 'Modal sugestão de formato (hist. 45) antes de fechar se ≠ ideal',
    automated: true,
  },
  { id: '390', label: 'Layout 390×844 — screenshot no PR', automated: false },
];
