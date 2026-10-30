import { BadRequestException } from '@nestjs/common';
import type { Player } from '@prisma/client';

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
