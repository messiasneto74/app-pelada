import type { RosterPlayer, RosterSegment } from './roster-player.model';

export function rosterPositionLabel(
  player: Pick<RosterPlayer, 'isGoalkeeper' | 'position'>,
): string {
  if (player.isGoalkeeper) {
    return 'Goleiro';
  }
  const pos = player.position?.trim();
  return pos && pos.length > 0 ? pos : 'Linha';
}

export function formatRosterRating(rating: number | null): string {
  return rating === null || Number.isNaN(rating) ? '—' : String(rating);
}

export function filterRosterBySegment(
  players: readonly RosterPlayer[],
  segment: RosterSegment,
): RosterPlayer[] {
  if (segment === 'all') {
    return [...players];
  }
  if (segment === 'gk') {
    return players.filter((p) => p.isGoalkeeper);
  }
  return players.filter((p) => !p.isGoalkeeper);
}

export function filterRosterBySearch(
  players: readonly RosterPlayer[],
  query: string,
): RosterPlayer[] {
  const q = query.trim().toLocaleLowerCase('pt-BR');
  if (!q) {
    return [...players];
  }
  return players.filter((p) =>
    p.displayName.toLocaleLowerCase('pt-BR').includes(q),
  );
}

export function filterRosterList(
  players: readonly RosterPlayer[],
  segment: RosterSegment,
  searchQuery: string,
): RosterPlayer[] {
  return filterRosterBySearch(
    filterRosterBySegment(players, segment),
    searchQuery,
  );
}
