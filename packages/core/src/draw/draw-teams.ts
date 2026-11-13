import { computeDrawBalanceMetrics } from './metrics.js';
import { computePlayerDrawScore } from './player-draw-score.js';
import { createSeededRandom, randomSeed, shuffle } from './rng.js';
import type {
  DrawGoalkeeperMode,
  DrawPlayerInput,
  RedrawDrawTeamsInput,
  DrawTeamSlot,
  DrawTeamsInput,
  DrawTeamsResult,
  DrawWeightInput,
  SwapDrawPlayersInput,
  SwapDrawPlayersResult,
} from './types.js';
import { DrawValidationError } from './types.js';

export function resolveGkMode(
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

/** Reexportado para `redrawDrawTeams` / API; retorna o modo GK efetivo. */
export function validateDrawTeamsInput(input: DrawTeamsInput): DrawGoalkeeperMode {
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
  return gkMode;
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
  playerToAdd?: DrawPlayerInput,
  gkMode?: DrawGoalkeeperMode,
  targetSizes?: number[] | null,
  relaxGkDuplicate?: boolean,
): number {
  const hasCap = targetSizes != null;
  const base = teams.map((t, i) => ({
    i,
    size: t.length,
    sum: sumTeamScore(t, playersById, weights),
    tie: random(),
  }));

  const allTeamsHaveGk = (): boolean =>
    teams.every((t) => t.some((id) => playersById.get(id)?.isGoalkeeper));

  const canPlace = (teamIdx: number): boolean => {
    if (hasCap && targetSizes![teamIdx] != null && teams[teamIdx].length >= targetSizes![teamIdx]) {
      return false;
    }
    if (!playerToAdd || gkMode !== 'ONE_PER_TEAM' || !playerToAdd.isGoalkeeper) {
      return true;
    }
    const hasGk = teams[teamIdx].some((id) => playersById.get(id)?.isGoalkeeper);
    if (!hasGk) {
      return true;
    }
    // Segundo+ goleiro no mesmo time só após todos já terem um (goleiros excedentes).
    return relaxGkDuplicate === true && allTeamsHaveGk();
  };

  const feasible = base.filter((t) => canPlace(t.i));
  if (feasible.length === 0) {
    throw new DrawValidationError(
      'Não foi possível alocar jogador: verifique vagas e regras de goleiro.',
    );
  }
  const smallest = Math.min(...feasible.map((t) => t.size));
  let candidates = feasible.filter((t) => t.size === smallest);
  candidates.sort((a, b) => a.sum - b.sum || a.tie - b.tie);
  return candidates[0].i;
}

function computeTargetSizes(playerCount: number, teamCount: number): number[] {
  const base = Math.floor(playerCount / teamCount);
  const extra = playerCount % teamCount;
  return Array.from({ length: teamCount }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Próximo time com vaga e regras de GK (regerar em modo aleatório). */
function pickRandomSlotTeam(
  teams: string[][],
  random: () => number,
  playersById: Map<string, DrawPlayerInput>,
  targetSizes: number[],
  playerToAdd: DrawPlayerInput,
  gkMode: DrawGoalkeeperMode,
): number {
  const teamCount = teams.length;
  const hasGk = (teamIdx: number): boolean =>
    teams[teamIdx].some((id) => playersById.get(id)?.isGoalkeeper);
  const allTeamsHaveGk = (): boolean =>
    teams.every((t, i) => t.length > 0 && hasGk(i));

  const canPlace = (teamIdx: number): boolean => {
    if (teams[teamIdx].length >= targetSizes[teamIdx]) {
      return false;
    }
    if (gkMode === 'FIXED_OFF_LINE' && playerToAdd.isGoalkeeper) {
      return false;
    }
    if (gkMode !== 'ONE_PER_TEAM' || !playerToAdd.isGoalkeeper) {
      return true;
    }
    if (!hasGk(teamIdx)) {
      return true;
    }
    return allTeamsHaveGk();
  };

  const start = Math.floor(random() * teamCount);
  for (let step = 0; step < teamCount; step++) {
    const i = (start + step) % teamCount;
    if (canPlace(i)) {
      return i;
    }
  }
  throw new DrawValidationError(
    'Não foi possível alocar jogador no modo aleatório: vagas ou regras de goleiro.',
  );
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
  const keepers = shuffle(
    players.filter((p) => p.isGoalkeeper),
    random,
  );
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
    const relax =
      Boolean(p.isGoalkeeper) &&
      teams.filter((t) => t.some((id) => playersById.get(id)?.isGoalkeeper)).length >= teamCount;
    const idx = pickBalancedTeam(
      teams,
      random,
      playersById,
      weights,
      p,
      'ONE_PER_TEAM',
      null,
      relax,
    );
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
  const shuffledLine = shuffle(line, random);
  const shuffledOverflowGks = shuffle(keepers, random);
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
  const shuffled = shuffle(line, random);
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

/**
 * História 53 — novo sorteio com jogadores fixos por time; demais posições sorteadas.
 */
export function redrawDrawTeams(input: RedrawDrawTeamsInput): DrawTeamsResult {
  const gkMode = validateDrawTeamsInput(input);
  const { teamCount, players, mode, weights, pinnedByTeam = {} } = input;
  const playersById = new Map(players.map((p) => [p.id, p]));

  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  const pinnedSet = new Set<string>();

  for (let ti = 0; ti < teamCount; ti++) {
    const raw = pinnedByTeam[ti] ?? [];
    for (const id of raw) {
      if (!id?.trim()) {
        throw new DrawValidationError(`pinnedByTeam[${ti}] contém id vazio.`);
      }
      if (!playersById.has(id)) {
        throw new DrawValidationError(`Jogador fixo desconhecido: ${id}`);
      }
      if (pinnedSet.has(id)) {
        throw new DrawValidationError(`Jogador ${id} fixo em mais de um time.`);
      }
      pinnedSet.add(id);
      teams[ti].push(id);
    }
  }

  if (pinnedSet.size === 0) {
    const { pinnedByTeam: _omitPins, ...rest } = input;
    return drawTeams(rest as DrawTeamsInput);
  }

  const seed = input.seed ?? randomSeed();
  const random = createSeededRandom(seed);

  const targetSizes = computeTargetSizes(players.length, teamCount);
  for (let i = 0; i < teamCount; i++) {
    if (teams[i].length > targetSizes[i]) {
      throw new DrawValidationError(
        `Time ${i}: mais jogadores fixos (${teams[i].length}) que vagas (${targetSizes[i]}).`,
      );
    }
  }

  for (let i = 0; i < teamCount; i++) {
    for (const id of teams[i]) {
      const pl = playersById.get(id)!;
      if (gkMode === 'FIXED_OFF_LINE' && pl.isGoalkeeper) {
        throw new DrawValidationError(
          `Modo goleiro fixo: jogador ${id} não pode ficar fixo nos times sorteados.`,
        );
      }
    }
  }

  const pool = players.filter((p) => !pinnedSet.has(p.id));

  let poolOrder: DrawPlayerInput[];
  if (mode === 'RANDOM') {
    const drawable =
      gkMode === 'FIXED_OFF_LINE' ? pool.filter((p) => !p.isGoalkeeper) : pool;
    poolOrder = shuffle(drawable, random);
  } else if (gkMode === 'FIXED_OFF_LINE') {
    const lineOnly = pool.filter((p) => !p.isGoalkeeper);
    poolOrder = sortLineForBalance(lineOnly, random, playersById, weights);
  } else {
    const linePool = pool.filter((p) => !p.isGoalkeeper);
    const gkPool = shuffle(
      pool.filter((p) => p.isGoalkeeper),
      random,
    );
    const orderedLine = sortLineForBalance(linePool, random, playersById, weights);
    poolOrder = [...orderedLine, ...gkPool];
  }

  for (const p of poolOrder) {
    if (mode === 'RANDOM') {
      const idx = pickRandomSlotTeam(teams, random, playersById, targetSizes, p, gkMode);
      teams[idx].push(p.id);
    } else {
      const relax =
        Boolean(p.isGoalkeeper) &&
        gkMode === 'ONE_PER_TEAM' &&
        teams.every((t) => t.some((id) => playersById.get(id)?.isGoalkeeper));
      const idx = pickBalancedTeam(
        teams,
        random,
        playersById,
        weights,
        p,
        gkMode,
        targetSizes,
        relax,
      );
      teams[idx].push(p.id);
    }
  }

  for (let i = 0; i < teamCount; i++) {
    if (teams[i].length !== targetSizes[i]) {
      throw new DrawValidationError(
        `Inconsistência ao regerar: time ${i} tem ${teams[i].length} jogadores, esperado ${targetSizes[i]}.`,
      );
    }
  }

  const metrics = computeDrawBalanceMetrics(teams, players, weights);
  const outTeams: DrawTeamSlot[] = teams.map((playerIds, teamIndex) => ({
    teamIndex,
    playerIds,
  }));

  return { teams: outTeams, metrics, seed };
}

/** História 54 — troca entre dois jogadores + recálculo de métricas (protótipo: GK só com GK no modo por time). */
export function swapDrawPlayers(input: SwapDrawPlayersInput): SwapDrawPlayersResult {
  const { players, playerAId, playerBId, teams: teamSlots, weights } = input;
  if (!playerAId?.trim() || !playerBId?.trim()) {
    throw new DrawValidationError('Informe dois ids para a troca.');
  }
  if (playerAId === playerBId) {
    throw new DrawValidationError('Os dois jogadores precisam ser diferentes.');
  }

  const playersById = new Map(players.map((p) => [p.id, p]));
  const pa = playersById.get(playerAId);
  const pb = playersById.get(playerBId);
  if (!pa) {
    throw new DrawValidationError(`Jogador A desconhecido: ${playerAId}`);
  }
  if (!pb) {
    throw new DrawValidationError(`Jogador B desconhecido: ${playerBId}`);
  }

  validateWeights(weights ?? {});
  const teamCount = teamSlots.length;
  if (teamCount < 2) {
    throw new DrawValidationError('Troca exige pelo menos dois times.');
  }

  const teams = teamSlots.map((t) => [...t.playerIds]);
  let idxA = -1;
  let idxB = -1;
  let posA = -1;
  let posB = -1;

  for (let i = 0; i < teams.length; i++) {
    const ia = teams[i].indexOf(playerAId);
    const ib = teams[i].indexOf(playerBId);
    if (ia >= 0) {
      idxA = i;
      posA = ia;
    }
    if (ib >= 0) {
      idxB = i;
      posB = ib;
    }
  }

  if (idxA < 0) {
    throw new DrawValidationError(`Jogador A não está em nenhum time: ${playerAId}`);
  }
  if (idxB < 0) {
    throw new DrawValidationError(`Jogador B não está em nenhum time: ${playerBId}`);
  }
  if (idxA === idxB) {
    throw new DrawValidationError('Troca exige jogadores de times diferentes.');
  }

  const gkMode = resolveGkMode(input.goalkeepersMode, players, teamCount);
  if (gkMode === 'ONE_PER_TEAM' && Boolean(pa.isGoalkeeper) !== Boolean(pb.isGoalkeeper)) {
    throw new DrawValidationError('Só é permitido trocar goleiro com goleiro.');
  }

  teams[idxA][posA] = playerBId;
  teams[idxB][posB] = playerAId;

  const metrics = computeDrawBalanceMetrics(teams, players, weights);
  const outTeams: DrawTeamSlot[] = teams.map((playerIds, teamIndex) => ({
    teamIndex,
    playerIds,
  }));

  return { teams: outTeams, metrics };
}

/** Histórias 47–51, 55 — sorteio equilibrado ou aleatório + métricas. */
export function drawTeams(input: DrawTeamsInput): DrawTeamsResult {
  const gkMode = validateDrawTeamsInput(input);
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
  RedrawDrawTeamsInput,
  DrawTeamSlot,
  DrawTeamsInput,
  DrawTeamsResult,
  DrawWeightInput,
  SwapDrawPlayersInput,
  SwapDrawPlayersResult,
} from './types.js';
export { DrawValidationError } from './types.js';
