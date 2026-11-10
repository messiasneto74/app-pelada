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
