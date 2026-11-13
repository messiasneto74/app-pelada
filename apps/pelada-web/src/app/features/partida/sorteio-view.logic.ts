import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
export { buildDrawShareText } from './sorteio-share.logic';

export type SorteioTeamView = {
  teamId: string;
  name: string;
  sortOrder: number;
  listId: string;
  averageLabel: string;
  players: RosterPlayer[];
};

export function teamAverageLabel(
  averages: readonly number[],
  teamIndex: number,
): string {
  const v = averages[teamIndex];
  if (v === undefined || Number.isNaN(v)) {
    return '—';
  }
  return v.toFixed(1).replace('.', ',');
}

/** Quando GET /players falha (fallback vazio) ou elenco desatualizado, ainda mostramos o sorteio. */
export function placeholderRosterPlayer(playerId: string): RosterPlayer {
  const short = playerId.length > 8 ? `${playerId.slice(0, 6)}…` : playerId;
  return {
    id: playerId,
    displayName: `Jogador ${short}`,
    isGoalkeeper: false,
    position: null,
    rating: null,
    tags: [],
    isFixedList: false,
  };
}

export function mapDrawToSorteioTeams(
  draw: MatchDrawDetailDto,
  rosterById: ReadonlyMap<string, RosterPlayer>,
): SorteioTeamView[] {
  const averages = draw.metrics.teamAverages;
  return [...draw.teams]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => {
      const ids = [...t.playerIds];
      const players = ids.map((id) => rosterById.get(id) ?? placeholderRosterPlayer(id));
      return {
        teamId: t.id,
        name: t.name,
        sortOrder: t.sortOrder,
        listId: `sorteio-team-${t.sortOrder}`,
        averageLabel: teamAverageLabel(averages, t.sortOrder),
        players,
      };
    });
}
