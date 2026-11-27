import type { MatchPresenceMode } from '../match/create-match-form.logic';
import type { PresenceRow } from './presence-attendance.model';

export function canOrganizerEditPresence(listClosed: boolean): boolean {
  return !listClosed;
}

export function canPlayerSelfEdit(
  listClosed: boolean,
  mode: MatchPresenceMode,
): boolean {
  if (listClosed) {
    return false;
  }
  return mode === 'SELF_CONFIRM' || mode === 'NAME_LIST';
}

export function presenceModeHint(mode: MatchPresenceMode): string {
  switch (mode) {
    case 'SELF_CONFIRM':
      return 'Cada jogador marca ✓ (vou) ou ✗ (não vou) aqui no app.';
    case 'NAME_LIST':
      return 'Lista de nomes: cada um coloca ou tira o próprio nome, na ordem de chegada.';
    default:
      return 'O adm marca quem vai.';
  }
}

export function rowPrimaryActionLabel(
  segment: 'confirmed' | 'pending' | 'queue',
  row: PresenceRow,
): string {
  if (row.kind === 'guest') {
    return 'Convidado';
  }
  if (segment === 'confirmed') {
    return 'Remover';
  }
  if (segment === 'queue') {
    return 'Sair da fila';
  }
  return 'Confirmar';
}

export function resolveSelfPlayerId(
  roster: ReadonlyArray<{ id: string; userId?: string | null }>,
  appUserId: string | null,
): string | null {
  if (!appUserId) {
    return null;
  }
  return roster.find((p) => p.userId != null && p.userId === appUserId)?.id ?? null;
}

export type SelfFooterAction = {
  label: string;
  accept: boolean;
  variant: 'lime' | 'secondary';
};

/**
 * Issue #234 — botão do jogador fixo no rodapé da Presença.
 * Lista de nomes: um botão só ("Colocar meu nome" / "Tirar meu nome").
 * Marcar presença: "✓ Vou" e "✗ Não vou".
 */
export function selfFooterActions(
  mode: MatchPresenceMode,
  status: PresenceRow['status'] | null,
): SelfFooterAction[] {
  const inList = status === 'confirmed' || status === 'queue';
  if (mode === 'NAME_LIST') {
    return inList
      ? [{ label: 'Tirar meu nome', accept: false, variant: 'secondary' }]
      : [{ label: 'Colocar meu nome', accept: true, variant: 'lime' }];
  }
  if (mode === 'SELF_CONFIRM') {
    return [
      { label: '✓ Vou', accept: true, variant: inList ? 'secondary' : 'lime' },
      { label: '✗ Não vou', accept: false, variant: 'secondary' },
    ];
  }
  return [];
}

/** Issue #234 — frase curta acima do botão do rodapé. */
export function selfStatusLine(
  status: PresenceRow['status'] | null,
  queuePosition: number | null,
): string {
  if (status === 'confirmed') {
    return 'Você está na lista.';
  }
  if (status === 'queue') {
    return queuePosition ? `Você é o ${queuePosition}º da lista de espera.` : 'Você está na lista de espera.';
  }
  return 'Você ainda não está na lista.';
}

export function selfActionLabels(status: PresenceRow['status']): {
  confirm: string;
  decline: string;
} | null {
  if (status === 'confirmed') {
    return { confirm: 'Confirmado', decline: 'Não vou' };
  }
  return { confirm: 'Vou', decline: 'Não vou' };
}
