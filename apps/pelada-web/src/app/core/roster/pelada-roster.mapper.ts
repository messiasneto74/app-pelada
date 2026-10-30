import type { PeladaRosterDto, PeladaRosterPlayerDto } from './pelada-roster-api.model';
import type { RosterPlayer } from './roster-player.model';

export function mapRosterPlayerDto(dto: PeladaRosterPlayerDto): RosterPlayer {
  return {
    id: dto.id,
    displayName: dto.displayName,
    isGoalkeeper: dto.isGoalkeeper,
    position: dto.position,
    rating: dto.rating,
    tags: dto.tags ?? [],
    isFixedList: dto.isFixedList,
  };
}

export function mapRosterDto(dto: PeladaRosterDto): RosterPlayer[] {
  return dto.players.map(mapRosterPlayerDto);
}

export function buildEmptyRosterDto(peladaId: string): PeladaRosterDto {
  return { peladaId, players: [] };
}
