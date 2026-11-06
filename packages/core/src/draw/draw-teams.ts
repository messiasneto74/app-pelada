import { computeDrawBalanceMetrics } from './metrics.js';
import { createSeededRandom, randomSeed } from './rng.js';
import type { DrawPlayerInput, DrawTeamsInput, DrawTeamsResult } from './types.js';
import { DrawValidationError } from './types.js';

function validateInput(input: DrawTeamsInput): void {
  if (!Number.isInteger(input.teamCount) || input.teamCount < 2 || input.teamCount > 6) {
    throw new DrawValidationError('teamCount deve estar entre 2 e 6.');
  }
  if (input.players.length < input.teamCount * 2) {
    throw new DrawValidationError(
      `Mínimo ${input.teamCount * 2} jogadores confirmados para ${input.teamCount} times.`,
    );
  }
  const ids = new Set<string>();
  for (const p of input.players) {
    if (!p.id?.trim()) {
      throw new DrawValidationError('Cada jogador precisa de id.');
    }
    if (ids.has(p.id)) {
      throw new DrawValidationError(`Id duplicado no sorteio: ${p.id}`);
    }
    ids.add(p.id);
    if (typeof p.rating !== 'number' || p.rating < 0 || p.rating > 10) {
      throw new DrawValidationError(`Nota inválida para ${p.id}.`);
    }
  }
}

function partitionBalanced(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
): string[][] {
  const keepers = players
    .filter((p) => p.isGoalkeeper)
    .sort(() => random() - 0.5);
  const fieldPlayers = players
    .filter((p) => !p.isGoalkeeper)
    .map((p) => ({ ...p, tie: random() }))
    .sort((a, b) => b.rating - a.rating || a.tie - b.tie);

  const teams: string[][] = Array.from({ length: teamCount }, () => []);

  keepers
    .slice(0, teamCount)
    .sort((a, b) => b.rating - a.rating)
    .forEach((p, i) => {
      teams[i].push(p.id);
    });

  const remainder = [...fieldPlayers, ...keepers.slice(teamCount)];
  for (const p of remainder) {
    const smallest = Math.min(...teams.map((t) => t.length));
    const targets = teams
      .map((t, i) => ({
        i,
        size: t.length,
        sum: t.reduce(
          (s, id) => s + (players.find((x) => x.id === id)?.rating ?? 0),
          0,
        ),
        tie: random(),
      }))
      .filter((t) => t.size === smallest)
      .sort((a, b) => a.sum - b.sum || a.tie - b.tie);
    teams[targets[0].i].push(p.id);
  }

  return teams;
}

function partitionRandom(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
): string[][] {
  const shuffled = [...players].sort(() => random() - 0.5);
  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  shuffled.forEach((p, index) => {
    teams[index % teamCount].push(p.id);
  });
  return teams;
}

/** Histórias 47–51, 55 — sorteio equilibrado ou aleatório + métricas. */
export function drawTeams(input: DrawTeamsInput): DrawTeamsResult {
  validateInput(input);
  const seed = input.seed ?? randomSeed();
  const random = createSeededRandom(seed);
  const teamIds =
    input.mode === 'RANDOM'
      ? partitionRandom(input.players, input.teamCount, random)
      : partitionBalanced(input.players, input.teamCount, random);

  const metrics = computeDrawBalanceMetrics(teamIds, input.players);
  const teams = teamIds.map((playerIds, teamIndex) => ({
    teamIndex,
    playerIds,
  }));

  return { teams, metrics, seed };
}

export { computeDrawBalanceMetrics } from './metrics.js';
export type {
  DrawBalanceMetrics,
} from './metrics.js';
export type {
  DrawMode,
  DrawPlayerInput,
  DrawTeamSlot,
  DrawTeamsInput,
  DrawTeamsResult,
} from './types.js';
export { DrawValidationError } from './types.js';
