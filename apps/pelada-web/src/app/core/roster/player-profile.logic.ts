import type { PlayerPaymentPlan } from './pelada-player-profile-api.model';

export const PLAYER_PROFILE_ATTRIBUTES = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'forca', label: 'Força' },
  { key: 'chute', label: 'Chute' },
  { key: 'passe', label: 'Passe' },
  { key: 'defesa', label: 'Defesa' },
  { key: 'velocidade', label: 'Velocidade' },
] as const;

export type PlayerProfileAttributeKey =
  (typeof PLAYER_PROFILE_ATTRIBUTES)[number]['key'];

/** História 27 + §3.8 — botão editar só para quem pode alterar nota/atributos. */
export function canShowEditProfile(input: {
  isOrganizador: boolean;
  allowPlayerSelfEdit: boolean;
  playerUserId: string | null;
  currentAppUserId: string | null;
}): boolean {
  if (input.isOrganizador) {
    return true;
  }
  if (!input.allowPlayerSelfEdit) {
    return false;
  }
  if (!input.playerUserId || !input.currentAppUserId) {
    return false;
  }
  return input.playerUserId === input.currentAppUserId;
}

export function attributeBarPercent(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 50;
  }
  const clamped = Math.min(10, Math.max(1, value));
  return clamped * 10;
}

export function paymentPlanLabel(plan: PlayerPaymentPlan): string {
  switch (plan) {
    case 'MONTHLY':
      return 'Mensalista';
    case 'PER_MATCH':
    default:
      return 'Por partida';
  }
}
