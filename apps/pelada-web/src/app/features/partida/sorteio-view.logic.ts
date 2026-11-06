import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import {
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';

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

export function buildDrawShareText(
  draw: MatchDrawDetailDto,
  rosterById: ReadonlyMap<string, RosterPlayer>,
  options?: { hideRatings?: boolean },
): string {
  const hide = options?.hideRatings ?? false;
  const lines: string[] = ['Times sorteados', ''];
  for (const team of [...draw.teams].sort((a, b) => a.sortOrder - b.sortOrder)) {
    lines.push(`${team.name}`);
    for (const pid of team.playerIds) {
      const p = rosterById.get(pid) ?? placeholderRosterPlayer(pid);
      const pos = rosterPositionLabel(p);
      const rating =
        hide || p.rating === null
          ? ''
          : ` · nota ${formatRosterRating(p.rating)}`;
      lines.push(`  · ${p.displayName} (${pos})${rating}`);
    }
    lines.push('');
  }
  lines.push(draw.metrics.summaryText.trim());
  return lines.join('\n').trim();
}
