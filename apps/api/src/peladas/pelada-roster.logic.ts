import { BadRequestException } from '@nestjs/common';
import type { PaymentPlan, Player } from '@prisma/client';

export type PeladaRosterPlayerDto = {
  id: string;
  displayName: string;
  isGoalkeeper: boolean;
  position: string | null;
  rating: number | null;
  tags: string[];
  isFixedList: boolean;
  userId: string | null;
  photoUrl: string | null;
};

export type PeladaRosterDto = {
  peladaId: string;
  players: PeladaRosterPlayerDto[];
};

export type PeladaPlayerProfileDto = PeladaRosterPlayerDto & {
  userId: string | null;
  paymentPlan: PaymentPlan;
  attributes: Record<string, number>;
};

export const PLAYER_ATTRIBUTE_KEYS = [
  'tecnica',
  'forca',
  'chute',
  'passe',
  'defesa',
  'velocidade',
] as const;

export type PlayerAttributeKey = (typeof PLAYER_ATTRIBUTE_KEYS)[number];

export function normalizePlayerAttributes(
  raw: unknown,
): Record<PlayerAttributeKey, number> {
  const out = {} as Record<PlayerAttributeKey, number>;
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const key of PLAYER_ATTRIBUTE_KEYS) {
    const v = source[key];
    out[key] =
      typeof v === 'number' && v >= 1 && v <= 10 ? Math.round(v) : 5;
  }
  return out;
}

export function toRosterPlayerDto(player: Player): PeladaRosterPlayerDto {
  return {
    id: player.id,
    displayName: player.displayName,
    isGoalkeeper: player.isGoalkeeper,
    position: player.position,
    rating: player.rating,
    tags: player.tags ?? [],
    isFixedList: player.isFixedList,
    userId: player.userId,
    photoUrl: player.photoUrl,
  };
}

export function toPlayerProfileDto(player: Player): PeladaPlayerProfileDto {
  return {
    ...toRosterPlayerDto(player),
    userId: player.userId,
    paymentPlan: player.paymentPlan,
    attributes: normalizePlayerAttributes(player.attributes),
  };
}

/** Regra 16: `isFixedList` só quando `fixedListOnly` está ativo na pelada. */
export function assertFixedListAllowed(
  fixedListOnly: boolean,
  isFixedList: boolean | undefined,
): void {
  if (isFixedList === true && !fixedListOnly) {
    throw new BadRequestException(
      'Marcar jogador como fixo na lista exige a regra "lista fixa" ativa (fixedListOnly).',
    );
  }
}

export function resolveIsFixedListForWrite(
  fixedListOnly: boolean,
  requested: boolean | undefined,
  current = false,
): boolean {
  assertFixedListAllowed(fixedListOnly, requested);
  if (requested !== undefined) {
    return requested;
  }
  return fixedListOnly ? current : false;
}

/** História 27 — PATCH perfil: organizador ou jogador com L27 no próprio vínculo. */
export function canPatchPlayerProfile(input: {
  isOrganizador: boolean;
  allowPlayerSelfEdit: boolean;
  playerUserId: string | null;
  currentUserId: string;
}): boolean {
  if (input.isOrganizador) {
    return true;
  }
  if (!input.allowPlayerSelfEdit) {
    return false;
  }
  if (!input.playerUserId) {
    return false;
  }
  return input.playerUserId === input.currentUserId;
}

const SELF_EDIT_KEYS = ['rating', 'tags', 'attributes'] as const;

/** Limita campos quando o jogador edita o próprio perfil (L27). */
export function pickSelfEditPatch<T extends Record<string, unknown>>(
  dto: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of SELF_EDIT_KEYS) {
    if (dto[key] !== undefined) {
      out[key as keyof T] = dto[key as keyof T];
    }
  }
  return out;
}
