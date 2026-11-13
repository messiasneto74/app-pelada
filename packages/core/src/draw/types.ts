export type DrawMode = 'BALANCED' | 'RANDOM';

/** Um goleiro por time (elenco) vs goleiros fixos fora da escalação do sorteio — histórias 5–7. */
export type DrawGoalkeeperMode = 'ONE_PER_TEAM' | 'FIXED_OFF_LINE';

/**
 * Pesos opcionais para a nota e sinais extras (história 10).
 * Omitir ou zerar extras mantém compatível com CORE-1 (só nota 0–10).
 */
export interface DrawWeightInput {
  /** Multiplicador da nota geral (0–10). Padrão 1. */
  rating?: number;
  /** Multiplicador de `attributeScore` (mesma escala 0–10). Padrão 0. */
  attribute?: number;
  /** Bônus por tag quando o jogador possui a tag (soma). */
  tags?: Record<string, number>;
  /** Bônus por texto de posição (ex.: "Ataque"). */
  position?: Record<string, number>;
}

export interface DrawPlayerInput {
  id: string;
  rating: number;
  isGoalkeeper?: boolean;
  /** Escala 0–10; entra no score apenas se `DrawWeightInput.attribute` > 0. */
  attributeScore?: number;
  tags?: string[];
  position?: string;
}

export interface DrawTeamsInput {
  players: DrawPlayerInput[];
  teamCount: number;
  mode: DrawMode;
  /**
   * Padrão `ONE_PER_TEAM`: reserva um goleiro por time quando há goleiros no elenco.
   * `FIXED_OFF_LINE`: goleiros não entram nos times sorteados (só linha).
   */
  goalkeepersMode?: DrawGoalkeeperMode;
  /** Peso da nota e sinais opcionais (história 10). */
  weights?: DrawWeightInput;
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

/** História 54 — troca entre dois jogadores de times diferentes + métricas. */
export interface SwapDrawPlayersInput {
  players: DrawPlayerInput[];
  teams: DrawTeamSlot[];
  playerAId: string;
  playerBId: string;
  goalkeepersMode?: DrawGoalkeeperMode;
  weights?: DrawWeightInput;
}

export interface SwapDrawPlayersResult {
  teams: DrawTeamSlot[];
  metrics: DrawBalanceMetrics;
}

/**
 * História 53 — sortear de novo mantendo jogadores fixos por time.
 * Demais vagas preenchidas com a mesma lógica de `drawTeams` (BALANCED / RANDOM).
 */
export interface RedrawDrawTeamsInput extends DrawTeamsInput {
  /** `teamIndex` → ids que permanecem nesse time; demais posições sorteadas de novo. */
  pinnedByTeam?: Partial<Record<number, string[]>>;
}

export class DrawValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrawValidationError';
  }
}
