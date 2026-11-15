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
