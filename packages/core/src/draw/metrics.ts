import type { DrawPlayerInput } from './types.js';

export interface DrawBalanceMetrics {
  /** 0–100 (protótipo: 100 − 10 × diferença entre médias). */
  balanceScore: number;
  teamAverages: number[];
  maxAverageDiff: number;
  summaryText: string;
}

const playerRating = (
  players: DrawPlayerInput[],
  id: string,
): number => players.find((p) => p.id === id)?.rating ?? 0;

export function computeDrawBalanceMetrics(
  teamPlayerIds: string[][],
  players: DrawPlayerInput[],
): DrawBalanceMetrics {
  const teamAverages = teamPlayerIds.map((ids) => {
    if (ids.length === 0) {
      return 0;
    }
    const sum = ids.reduce((s, id) => s + playerRating(players, id), 0);
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
