import {
  drawTeams,
  type DrawPlayerInput,
  type DrawTeamsResult,
  swapDrawPlayers,
} from '@pelada/core';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import {
  placeholderRosterPlayer,
  teamAverageLabel,
  type SorteioTeamView,
} from '../partida/sorteio-view.logic';

/** Elenco fixo para `/dev/sorteio-3-5` — sorteio 100% no browser (`@pelada/core`). */
export const SPIKE_MOCK_ROSTER: RosterPlayer[] = [
  {
    id: 'p1',
    displayName: 'Ana Silva',
    isGoalkeeper: true,
    position: null,
    rating: 8,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p2',
    displayName: 'Bruno Ferreira',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 6,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p3',
    displayName: 'Carlos Lima',
    isGoalkeeper: false,
    position: 'Ataque',
    rating: 7,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p4',
    displayName: 'Diego Souza',
    isGoalkeeper: true,
    position: null,
    rating: 7,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p5',
    displayName: 'Eduardo Ramos',
    isGoalkeeper: false,
    position: 'Zaga',
    rating: 6,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p6',
    displayName: 'Felipe Costa',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 6,
    tags: [],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p7',
    displayName: 'Gabriel Alves',
    isGoalkeeper: false,
    position: 'Ataque',
    rating: 8,
    tags: ['veloz'],
    isFixedList: false,
    userId: null,
  },
  {
    id: 'p8',
    displayName: 'Henrique Dias',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 5,
    tags: [],
    isFixedList: false,
    userId: null,
  },
];

export type SpikeDrawState = {
  draw: DrawTeamsResult;
  drawPlayers: DrawPlayerInput[];
  teams: SorteioTeamView[];
  rosterById: ReadonlyMap<string, RosterPlayer>;
};

export function rosterToDrawPlayers(
  roster: readonly RosterPlayer[],
): DrawPlayerInput[] {
  return roster.map((p) => ({
    id: p.id,
    rating: typeof p.rating === 'number' ? p.rating : 5,
    isGoalkeeper: p.isGoalkeeper,
    tags: p.tags.length ? [...p.tags] : undefined,
    position: p.position ?? undefined,
  }));
}

function teamDisplayName(teamIndex: number): string {
  return teamIndex === 0 ? 'Time A' : teamIndex === 1 ? 'Time B' : `Time ${teamIndex + 1}`;
}

export function mapSpikeDrawToTeams(
  draw: DrawTeamsResult,
  rosterById: ReadonlyMap<string, RosterPlayer>,
): SorteioTeamView[] {
  const averages = draw.metrics.teamAverages;
  return [...draw.teams]
    .sort((a, b) => a.teamIndex - b.teamIndex)
    .map((slot) => ({
      teamId: `spike-${slot.teamIndex}`,
      name: teamDisplayName(slot.teamIndex),
      sortOrder: slot.teamIndex,
      listId: `sorteio-team-${slot.teamIndex}`,
      averageLabel: teamAverageLabel(averages, slot.teamIndex),
      players: slot.playerIds.map(
        (id) => rosterById.get(id) ?? placeholderRosterPlayer(id),
      ),
    }));
}

export function buildSpikeDrawState(
  roster: readonly RosterPlayer[],
  seed: number,
): SpikeDrawState {
  const drawPlayers = rosterToDrawPlayers(roster);
  const draw = drawTeams({
    players: drawPlayers,
    teamCount: 2,
    mode: 'BALANCED',
    goalkeepersMode: 'ONE_PER_TEAM',
    seed,
  });
  const rosterById = new Map(roster.map((p) => [p.id, p]));
  return {
    draw,
    drawPlayers,
    rosterById,
    teams: mapSpikeDrawToTeams(draw, rosterById),
  };
}

export function redrawSpikeBalanced(state: SpikeDrawState, seed: number): SpikeDrawState {
  return buildSpikeDrawState([...state.rosterById.values()], seed);
}

export function swapSpikePlayers(
  state: SpikeDrawState,
  playerAId: string,
  playerBId: string,
): SpikeDrawState {
  const swapped = swapDrawPlayers({
    players: state.drawPlayers,
    teams: state.draw.teams,
    playerAId,
    playerBId,
    goalkeepersMode: 'ONE_PER_TEAM',
  });
  const draw: DrawTeamsResult = {
    teams: swapped.teams,
    metrics: swapped.metrics,
    seed: state.draw.seed,
  };
  return {
    draw,
    drawPlayers: state.drawPlayers,
    rosterById: state.rosterById,
    teams: mapSpikeDrawToTeams(draw, state.rosterById),
  };
}
