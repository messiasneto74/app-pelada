export type DrawMode = 'BALANCED' | 'RANDOM';

export interface DrawPlayerInput {
  id: string;
  rating: number;
  isGoalkeeper?: boolean;
}

export interface DrawTeamsInput {
  players: DrawPlayerInput[];
  teamCount: number;
  mode: DrawMode;
  /** Opcional — reprodutível em testes / regerar. */
  seed?: number;
}

export interface DrawTeamSlot {
  teamIndex: number;
  playerIds: string[];
}

import type { DrawBalanceMetrics } from './metrics.js';

export interface DrawTeamsResult {
  teams: DrawTeamSlot[];
  metrics: DrawBalanceMetrics;
  seed: number;
}

export class DrawValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrawValidationError';
  }
}
