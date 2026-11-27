export type FieldRotationPolicy =
  | 'WINNER_STAYS'
  | 'REST_QUEUE'
  | 'SEQUENTIAL';

export type FieldSessionTeamView = {
  sortOrder: number;
  drawTeamId: string;
  name: string;
  role: 'HOME' | 'AWAY' | 'REST';
};

export type MatchFieldSessionDto = {
  sessionId: string;
  matchId: string;
  rotationPolicy: FieldRotationPolicy;
  roundNumber: number;
  scoreHome: number;
  scoreAway: number;
  elapsedMs: number;
  /** Issue #229 — tempo da rodada atual (zera a cada rodada, para no limite). */
  roundElapsedMs?: number;
  /** Issue #229 — tempo de cada partida (Regras). */
  roundLimitMs?: number;
  /** Issue #229 — a rodada chegou no tempo definido. */
  timeUp?: boolean;
  timerRunning: boolean;
  timerRunningSince: string | null;
  finishedAt: string | null;
  teamsOnField: FieldSessionTeamView[];
  restingTeams: Array<{ sortOrder: number; drawTeamId: string; name: string }>;
  fixedGkMeta: Record<string, unknown>;
};

export type PatchMatchFieldSessionBody = {
  timer?: 'start' | 'pause';
  addGoal?: 'HOME' | 'AWAY';
  /** Autor do gol (issue #214) — precisa estar no time em campo do lado `addGoal`. */
  goalPlayerId?: string;
  undoGoal?: boolean;
};

export type PostMatchFieldSessionBody = {
  rotationPolicy?: FieldRotationPolicy;
};

/** Resumo "do dia" (por time), a partir do histórico de rodadas já encerradas (§3.6/épico histórico). */
export type MatchDaySummaryDto = {
  matchId: string;
  rounds: number;
  teams: Array<{
    drawTeamId: string;
    name: string;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
  topScorer: { playerId: string; displayName: string; goals: number } | null;
  biggestWin: {
    winnerDrawTeamId: string;
    winnerName: string;
    loserDrawTeamId: string;
    loserName: string;
    scoreWinner: number;
    scoreLoser: number;
    margin: number;
  } | null;
  mostLosses: { drawTeamId: string; name: string; losses: number } | null;
  text: string;
};
