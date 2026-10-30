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
