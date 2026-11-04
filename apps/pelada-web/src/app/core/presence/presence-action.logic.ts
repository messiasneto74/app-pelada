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
  return mode === 'SELF_CONFIRM';
}

export function presenceModeHint(mode: MatchPresenceMode): string {
  return mode === 'SELF_CONFIRM'
    ? 'Modo jogador confirma: cada um marca presença no app.'
    : 'Modo org. fecha lista: adm confirma ou remove jogadores.';
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

export function selfActionLabels(status: PresenceRow['status']): {
  confirm: string;
  decline: string;
} | null {
  if (status === 'confirmed') {
    return { confirm: 'Confirmado', decline: 'Não vou' };
  }
  return { confirm: 'Vou', decline: 'Não vou' };
}
