import type { DrawPlayerInput, DrawWeightInput } from './types.js';

/** Pontuação usada no equilíbrio do sorteio (história 10 — pesos opcionais). */
export function computePlayerDrawScore(
  player: DrawPlayerInput,
  weights?: DrawWeightInput,
): number {
  const w = weights ?? {};
  const ratingW = w.rating ?? 1;
  const attrW = w.attribute ?? 0;
  let score = player.rating * ratingW;
  if (player.attributeScore != null) {
    score += player.attributeScore * attrW;
  }
  const tagWeights = w.tags ?? {};
  for (const tag of player.tags ?? []) {
    score += tagWeights[tag] ?? 0;
  }
  const posWeights = w.position ?? {};
  if (player.position != null && player.position.trim() !== '') {
    score += posWeights[player.position] ?? 0;
  }
  return score;
}
