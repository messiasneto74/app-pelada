/** Resposta de GET/POST/PATCH …/matches/:matchId/draw (5-API). */
export type MatchDrawTeamDto = {
  id: string;
  name: string;
  sortOrder: number;
  playerIds: string[];
  players: { playerId: string; sortOrder: number }[];
};

export type MatchDrawDetailDto = {
  drawId: string;
  matchId: string;
  balanceScore: number | null;
  seed: string | null;
  metrics: {
    balanceScore: number;
    teamAverages: number[];
    maxAverageDiff: number;
    summaryText: string;
  };
  teams: MatchDrawTeamDto[];
};

export type PostMatchDrawBody = {
  seed?: number;
  mode?: 'BALANCED' | 'RANDOM';
  pinnedByTeam?: Record<string, string[]>;
};

export type PatchDrawSwapBody = {
  playerAId: string;
  playerBId: string;
};
