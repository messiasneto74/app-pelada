import type {
  FieldRotationPolicy,
  MatchFieldSessionDto,
} from '../../core/match/match-field-session-api.model';

export function rotationPolicyLabel(policy: FieldRotationPolicy): string {
  switch (policy) {
    case 'WINNER_STAYS':
      return 'Ganha fica';
    case 'REST_QUEUE':
      return 'Rodízio com descanso';
    case 'SEQUENTIAL':
      return 'Sequencial (A×B, B×C…)';
    default:
      return policy;
  }
}

export function formatTimerLabel(totalMs: number): string {
  const sec = Math.max(0, Math.floor(totalMs / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * A API já devolve `elapsedMs` com snapshot (ver `MatchFieldSessionService.toDto`).
 * O client só soma o tempo desde `anchorMs` (momento em que o DTO foi recebido).
 */
export function displayElapsedMs(
  session: Pick<MatchFieldSessionDto, 'elapsedMs' | 'timerRunning'>,
  nowMs: number,
  anchorMs: number,
): number {
  if (!session.timerRunning) {
    return session.elapsedMs;
  }
  return session.elapsedMs + Math.max(0, nowMs - anchorMs);
}

export function homeTeamName(session: MatchFieldSessionDto): string {
  return session.teamsOnField.find((t) => t.role === 'HOME')?.name ?? 'Time A';
}

export function awayTeamName(session: MatchFieldSessionDto): string {
  return session.teamsOnField.find((t) => t.role === 'AWAY')?.name ?? 'Time B';
}

export type GoalScorerOption = { playerId: string; name: string };

/**
 * Issue #214 — quem pode ter feito o gol: os jogadores do time em campo do
 * lado que marcou (HOME/AWAY), pelo sorteio, em ordem alfabética.
 */
export function goalScorerOptions(
  session: MatchFieldSessionDto,
  side: 'HOME' | 'AWAY',
  drawTeams: ReadonlyArray<{ id: string; playerIds: string[] }>,
  nameById: ReadonlyMap<string, string>,
): GoalScorerOption[] {
  const teamId = session.teamsOnField.find((t) => t.role === side)?.drawTeamId;
  const team = drawTeams.find((t) => t.id === teamId);
  if (!team) {
    return [];
  }
  return team.playerIds
    .map((playerId) => ({ playerId, name: nameById.get(playerId) ?? 'Jogador' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Issue #229 — tempo padrão de cada partida quando a API ainda não manda o limite. */
export const DEFAULT_ROUND_LIMIT_MS = 20 * 60 * 1000;

/**
 * Issue #229 — o que o cronômetro mostra: o tempo da rodada atual (zera a cada
 * rodada), parando no tempo definido nas Regras.
 */
export function displayRoundMs(
  session: Pick<MatchFieldSessionDto, 'elapsedMs' | 'timerRunning' | 'roundElapsedMs' | 'roundLimitMs' | 'timeUp'>,
  nowMs: number,
  anchorMs: number,
): number {
  const limit = session.roundLimitMs ?? DEFAULT_ROUND_LIMIT_MS;
  if (session.timeUp) {
    return limit;
  }
  const base = session.roundElapsedMs ?? session.elapsedMs;
  const live = session.timerRunning ? Math.max(0, nowMs - anchorMs) : 0;
  return Math.min(limit, base + live);
}
