import { computePlayerDrawScore } from './player-draw-score.js';
import type { DrawPlayerInput, DrawWeightInput } from './types.js';

export interface DrawBalanceMetrics {
  /** 0–100 (protótipo: 100 − 10 × diferença entre médias). */
  balanceScore: number;
  /** Médias da pontuação efetiva (nota + pesos opcionais — CORE-2). */
  teamAverages: number[];
  maxAverageDiff: number;
  summaryText: string;
}

const effectiveScore = (
  players: DrawPlayerInput[],
  id: string,
  weights?: DrawWeightInput,
): number => {
  const p = players.find((x) => x.id === id);
  return p ? computePlayerDrawScore(p, weights) : 0;
};

export function computeDrawBalanceMetrics(
  teamPlayerIds: string[][],
  players: DrawPlayerInput[],
  weights?: DrawWeightInput,
): DrawBalanceMetrics {
  const teamAverages = teamPlayerIds.map((ids) => {
    if (ids.length === 0) {
      return 0;
    }
    const sum = ids.reduce((s, id) => s + effectiveScore(players, id, weights), 0);
    return sum / ids.length;
  });
  const maxAverageDiff =
    teamAverages.length === 0
      ? 0
      : Math.max(...teamAverages) - Math.min(...teamAverages);
  const balanceScore = Math.max(0, Math.min(100, 100 - maxAverageDiff * 10));
  const summaryText =
    maxAverageDiff <= 0.05
      ? 'Médias iguais entre os times.'
      : `Diferença de ${maxAverageDiff.toFixed(2)} entre as médias.`;
  return {
    balanceScore,
    teamAverages,
    maxAverageDiff,
    summaryText,
  };
}
