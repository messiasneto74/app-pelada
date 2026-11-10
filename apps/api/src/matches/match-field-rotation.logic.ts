export type FieldRotationPolicy = 'WINNER_STAYS' | 'REST_QUEUE' | 'SEQUENTIAL';

export type RoundSideInput = {
  policy: FieldRotationPolicy;
  teamCount: number;
  roundNumber: number;
  homeTeamSortOrder: number;
  awayTeamSortOrder: number;
  scoreHome: number;
  scoreAway: number;
};

export type RoundSideResult = {
  homeTeamSortOrder: number;
  awayTeamSortOrder: number;
  roundNumber: number;
};

export function readRotationPolicy(
  extra: unknown,
  override?: unknown,
): FieldRotationPolicy {
  const from = pickPolicy(override) ?? pickPolicy(extra);
  return from ?? 'WINNER_STAYS';
}

function pickPolicy(src: unknown): FieldRotationPolicy | null {
  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    return null;
  }
  const o = src as Record<string, unknown>;
  const nested =
    o['extra'] && typeof o['extra'] === 'object' && !Array.isArray(o['extra'])
      ? (o['extra'] as Record<string, unknown>)['rotationPolicy']
      : o['rotationPolicy'];
  if (nested === 'REST_QUEUE' || nested === 'SEQUENTIAL' || nested === 'WINNER_STAYS') {
    return nested;
  }
  return null;
}

export function computeNextRoundSides(input: RoundSideInput): RoundSideResult {
  const { policy, teamCount } = input;
  if (teamCount < 2) {
    throw new Error('teamCount inválido');
  }
  if (teamCount === 2) {
    return {
      homeTeamSortOrder: input.homeTeamSortOrder,
      awayTeamSortOrder: input.awayTeamSortOrder,
      roundNumber: input.roundNumber + 1,
    };
  }
  switch (policy) {
    case 'SEQUENTIAL':
      return sequentialNext(input);
    case 'REST_QUEUE':
      return restQueueNext(input);
    case 'WINNER_STAYS':
    default:
      return winnerStaysNext(input);
  }
}

function winnerIndex(input: RoundSideInput): number {
  if (input.scoreHome > input.scoreAway) {
    return input.homeTeamSortOrder;
  }
  if (input.scoreAway > input.scoreHome) {
    return input.awayTeamSortOrder;
  }
  return input.awayTeamSortOrder;
}

function waitingOrders(
  teamCount: number,
  onField: readonly number[],
): number[] {
  const set = new Set(onField);
  const out: number[] = [];
  for (let i = 0; i < teamCount; i++) {
    if (!set.has(i)) {
      out.push(i);
    }
  }
  return out;
}

function winnerStaysNext(input: RoundSideInput): RoundSideResult {
  const winner = winnerIndex(input);
  const waiting = waitingOrders(input.teamCount, [
    input.homeTeamSortOrder,
    input.awayTeamSortOrder,
  ]);
  const entry = waiting[(input.roundNumber - 1) % waiting.length] ?? waiting[0];
  return {
    homeTeamSortOrder: winner,
    awayTeamSortOrder: entry,
    roundNumber: input.roundNumber + 1,
  };
}

function restQueueNext(input: RoundSideInput): RoundSideResult {
  const winner = winnerIndex(input);
  const waiting = waitingOrders(input.teamCount, [
    input.homeTeamSortOrder,
    input.awayTeamSortOrder,
  ]);
  const loser =
    winner === input.homeTeamSortOrder
      ? input.awayTeamSortOrder
      : input.homeTeamSortOrder;
  const queue = [...waiting, loser];
  const entry = queue[(input.roundNumber - 1) % queue.length] ?? queue[0];
  return {
    homeTeamSortOrder: winner,
    awayTeamSortOrder: entry,
    roundNumber: input.roundNumber + 1,
  };
}

function sequentialNext(input: RoundSideInput): RoundSideResult {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < input.teamCount; i++) {
    pairs.push([i, (i + 1) % input.teamCount]);
  }
  const [home, away] = pairs[(input.roundNumber) % pairs.length]!;
  return {
    homeTeamSortOrder: home,
    awayTeamSortOrder: away,
    roundNumber: input.roundNumber + 1,
  };
}

export function snapshotElapsedMs(
  elapsedMs: number,
  timerRunningSince: Date | null,
  now: Date = new Date(),
): number {
  if (!timerRunningSince) {
    return elapsedMs;
  }
  return elapsedMs + Math.max(0, now.getTime() - timerRunningSince.getTime());
}

export function applyTimerAction(
  elapsedMs: number,
  timerRunningSince: Date | null,
  action: 'start' | 'pause',
  now: Date = new Date(),
): { elapsedMs: number; timerRunningSince: Date | null } {
  if (action === 'start') {
    if (timerRunningSince) {
      return { elapsedMs, timerRunningSince };
    }
    return { elapsedMs, timerRunningSince: now };
  }
  if (!timerRunningSince) {
    return { elapsedMs, timerRunningSince: null };
  }
  return {
    elapsedMs: snapshotElapsedMs(elapsedMs, timerRunningSince, now),
    timerRunningSince: null,
  };
}

export type FixedGkRotation = 'RESULT' | 'SIDE' | 'MANUAL_ONLY';

export function updateFixedGkMeta(
  existing: Record<string, unknown>,
  input: {
    goalkeeperMode: string;
    fixedGkRotation: FixedGkRotation | null;
    homeTeamSortOrder: number;
    awayTeamSortOrder: number;
    scoreHome: number;
    scoreAway: number;
  },
): Record<string, unknown> {
  if (
    input.goalkeeperMode !== 'FIXED_GLOBAL' ||
    input.fixedGkRotation !== 'RESULT'
  ) {
    return existing;
  }
  const winner =
    input.scoreHome >= input.scoreAway
      ? input.homeTeamSortOrder
      : input.awayTeamSortOrder;
  return {
    ...existing,
    gkTeamSortOrder: winner,
    lastWinnerSortOrder: winner,
  };
}

export function readFixedGkRotation(extra: unknown): FixedGkRotation | null {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
    return null;
  }
  const v = (extra as Record<string, unknown>)['fixedGkRotation'];
  if (v === 'RESULT' || v === 'SIDE' || v === 'MANUAL_ONLY') {
    return v;
  }
  return null;
}
