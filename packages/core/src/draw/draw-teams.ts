import { computeDrawBalanceMetrics } from './metrics.js';
import { computePlayerDrawScore } from './player-draw-score.js';
import { createSeededRandom, randomSeed } from './rng.js';
import type {
  DrawGoalkeeperMode,
  DrawPlayerInput,
  DrawTeamsInput,
  DrawTeamsResult,
  DrawWeightInput,
} from './types.js';
import { DrawValidationError } from './types.js';

function resolveGkMode(
  mode: DrawGoalkeeperMode | undefined,
  players: DrawPlayerInput[],
  teamCount: number,
): DrawGoalkeeperMode {
  if (mode != null) {
    return mode;
  }
  const gkCount = players.filter((p) => p.isGoalkeeper).length;
  return gkCount >= teamCount ? 'ONE_PER_TEAM' : 'FIXED_OFF_LINE';
}

function validateWeights(weights: DrawWeightInput): void {
  const checkNum = (name: string, v: number | undefined) => {
    if (v === undefined) {
      return;
    }
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new DrawValidationError(`Peso inválido em weights.${name}.`);
    }
  };
  checkNum('rating', weights.rating);
  checkNum('attribute', weights.attribute);
  for (const [k, v] of Object.entries(weights.tags ?? {})) {
    if (!k?.trim()) {
      throw new DrawValidationError('Tag vazia em weights.tags.');
    }
    checkNum(`tags['${k}']`, v);
  }
  for (const [k, v] of Object.entries(weights.position ?? {})) {
    if (!k?.trim()) {
      throw new DrawValidationError('Posição vazia em weights.position.');
    }
    checkNum(`position['${k}']`, v);
  }
}

function validateInput(input: DrawTeamsInput): void {
  if (input.goalkeepersMode != null && input.goalkeepersMode !== 'ONE_PER_TEAM' && input.goalkeepersMode !== 'FIXED_OFF_LINE') {
    throw new DrawValidationError('goalkeepersMode deve ser ONE_PER_TEAM ou FIXED_OFF_LINE.');
  }
  validateWeights(input.weights ?? {});

  if (!Number.isInteger(input.teamCount) || input.teamCount < 2 || input.teamCount > 6) {
    throw new DrawValidationError('teamCount deve estar entre 2 e 6.');
  }
  if (input.players.length < input.teamCount * 2) {
    throw new DrawValidationError(
      `Mínimo ${input.teamCount * 2} jogadores confirmados para ${input.teamCount} times.`,
    );
  }
  const ids = new Set<string>();
  const gkMode = resolveGkMode(input.goalkeepersMode, input.players, input.teamCount);
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
    if (p.attributeScore != null && (typeof p.attributeScore !== 'number' || p.attributeScore < 0 || p.attributeScore > 10)) {
      throw new DrawValidationError(`attributeScore inválido para ${p.id}.`);
    }
    for (const t of p.tags ?? []) {
      if (!t?.trim()) {
        throw new DrawValidationError(`Tag vazia para ${p.id}.`);
      }
    }
  }

  const lineCount = input.players.filter((p) => !p.isGoalkeeper).length;
  if (gkMode === 'FIXED_OFF_LINE' && lineCount < input.teamCount * 2) {
    throw new DrawValidationError(
      'Modo goleiro fixo / só linha: faltam jogadores de linha para preencher os times (mínimo 2 por time, sem contar goleiros).',
    );
  }
  const gks = input.players.filter((p) => p.isGoalkeeper);
  if (gkMode === 'ONE_PER_TEAM' && gks.length < input.teamCount) {
    throw new DrawValidationError(
      `Modo um goleiro por time: confirme pelo menos ${input.teamCount} goleiros.`,
    );
  }
}

type WithTie = DrawPlayerInput & { tie: number };

function sortLineForBalance(
  line: DrawPlayerInput[],
  random: () => number,
  playersById: Map<string, DrawPlayerInput>,
  weights?: DrawWeightInput,
): WithTie[] {
  return line
    .map((p) => ({ ...p, tie: random() }))
    .sort((a, b) => {
      const sa = computePlayerDrawScore(playersById.get(a.id)!, weights);
      const sb = computePlayerDrawScore(playersById.get(b.id)!, weights);
      return sb - sa || a.tie - b.tie;
    });
}

function sumTeamScore(
  teamIds: string[],
  playersById: Map<string, DrawPlayerInput>,
  weights?: DrawWeightInput,
): number {
  return teamIds.reduce((s, id) => s + computePlayerDrawScore(playersById.get(id)!, weights), 0);
}

function pickBalancedTeam(
  teams: string[][],
  random: () => number,
  playersById: Map<string, DrawPlayerInput>,
  weights?: DrawWeightInput,
): number {
  const smallest = Math.min(...teams.map((t) => t.length));
  const candidates = teams
    .map((t, i) => ({
      i,
      size: t.length,
      sum: sumTeamScore(t, playersById, weights),
      tie: random(),
    }))
    .filter((t) => t.size === smallest)
    .sort((a, b) => a.sum - b.sum || a.tie - b.tie);
  return candidates[0].i;
}

/**
 * Um goleiro por time: reserva GK nos times e preenche com a linha (CORE-1 + história 5–7).
 */
function partitionBalancedOneGkPerTeam(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
  weights?: DrawWeightInput,
): string[][] {
  const playersById = new Map(players.map((p) => [p.id, p]));
  const keepers = players
    .filter((p) => p.isGoalkeeper)
    .sort(() => random() - 0.5);
  const line = players.filter((p) => !p.isGoalkeeper);
  const orderedLine = sortLineForBalance(line, random, playersById, weights);

  const teams: string[][] = Array.from({ length: teamCount }, () => []);

  keepers
    .slice(0, teamCount)
    .sort((a, b) => computePlayerDrawScore(b, weights) - computePlayerDrawScore(a, weights))
    .forEach((p, i) => {
      teams[i].push(p.id);
    });

  const remainder = [...orderedLine, ...keepers.slice(teamCount)];
  for (const p of remainder) {
    const idx = pickBalancedTeam(teams, random, playersById, weights);
    teams[idx].push(p.id);
  }

  return teams;
}

/** Goleiros fixos fora da escalação: só entra a linha no sorteio (histórias 56–58). */
function partitionBalancedFixedGks(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
  weights?: DrawWeightInput,
): string[][] {
  const playersById = new Map(players.map((p) => [p.id, p]));
  const line = players.filter((p) => !p.isGoalkeeper);
  if (line.length < teamCount * 2) {
    throw new DrawValidationError(
      'Modo goleiro fixo: faltam jogadores de linha para preencher os times (mínimo 2 por time, sem contar goleiros).',
    );
  }
  const orderedLine = sortLineForBalance(line, random, playersById, weights);
  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  for (const p of orderedLine) {
    const idx = pickBalancedTeam(teams, random, playersById, weights);
    teams[idx].push(p.id);
  }
  return teams;
}

function partitionBalanced(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
  gkMode: DrawGoalkeeperMode,
  weights?: DrawWeightInput,
): string[][] {
  return gkMode === 'FIXED_OFF_LINE'
    ? partitionBalancedFixedGks(players, teamCount, random, weights)
    : partitionBalancedOneGkPerTeam(players, teamCount, random, weights);
}

function partitionRandomOneGkPerTeam(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
): string[][] {
  const keepers = players.filter((p) => p.isGoalkeeper);
  const line = players.filter((p) => !p.isGoalkeeper);
  const shuffledLine = [...line].sort(() => random() - 0.5);
  const shuffledOverflowGks = [...keepers].sort(() => random() - 0.5);
  const teams: string[][] = Array.from({ length: teamCount }, () => []);

  shuffledOverflowGks
    .slice(0, teamCount)
    .forEach((p, i) => {
      teams[i].push(p.id);
    });
  const rest = [...shuffledLine, ...shuffledOverflowGks.slice(teamCount)];
  rest.forEach((p, index) => {
    teams[index % teamCount].push(p.id);
  });
  return teams;
}

function partitionRandomFixedGks(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
): string[][] {
  const line = players.filter((p) => !p.isGoalkeeper);
  if (line.length < teamCount * 2) {
    throw new DrawValidationError(
      'Modo goleiro fixo: faltam jogadores de linha para preencher os times (mínimo 2 por time, sem contar goleiros).',
    );
  }
  const shuffled = [...line].sort(() => random() - 0.5);
  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  shuffled.forEach((p, index) => {
    teams[index % teamCount].push(p.id);
  });
  return teams;
}

function partitionRandom(
  players: DrawPlayerInput[],
  teamCount: number,
  random: () => number,
  gkMode: DrawGoalkeeperMode,
): string[][] {
  return gkMode === 'FIXED_OFF_LINE'
    ? partitionRandomFixedGks(players, teamCount, random)
    : partitionRandomOneGkPerTeam(players, teamCount, random);
}

/** Histórias 47–51, 55 — sorteio equilibrado ou aleatório + métricas. */
export function drawTeams(input: DrawTeamsInput): DrawTeamsResult {
  validateInput(input);
  const gkMode = resolveGkMode(input.goalkeepersMode, input.players, input.teamCount);
  const seed = input.seed ?? randomSeed();
  const random = createSeededRandom(seed);
  const teamIds =
    input.mode === 'RANDOM'
      ? partitionRandom(input.players, input.teamCount, random, gkMode)
      : partitionBalanced(input.players, input.teamCount, random, gkMode, input.weights);

  const metrics = computeDrawBalanceMetrics(teamIds, input.players, input.weights);
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
  DrawGoalkeeperMode,
  DrawMode,
  DrawPlayerInput,
  DrawTeamSlot,
  DrawTeamsInput,
  DrawTeamsResult,
  DrawWeightInput,
} from './types.js';
export { DrawValidationError } from './types.js';
