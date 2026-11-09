import type { GoalkeeperMode } from '@prisma/client';
import type { DrawGoalkeeperMode, DrawWeightInput } from '@pelada/core';

/** Prisma → motor CORE-1 (`drawTeams`). */
export function mapGoalkeeperMode(mode: GoalkeeperMode): DrawGoalkeeperMode {
  if (mode === 'FIXED_PER_TEAM') {
    return 'ONE_PER_TEAM';
  }
  // ROTATING e FIXED_GLOBAL: sem exigir GK dedicado por time no sorteio.
  return 'FIXED_OFF_LINE';
}

/**
 * Converte `drawWeights` persistidos (flags 3.2 ou pesos numéricos legados) → `DrawWeightInput`.
 */
export function parseDrawWeights(
  json: Record<string, unknown>,
): DrawWeightInput | undefined {
  const w = json;
  const ratingNum = typeof w['rating'] === 'number' ? w['rating'] : undefined;
  const attributeNum =
    typeof w['attribute'] === 'number' ? w['attribute'] : undefined;
  const tags =
    typeof w['tags'] === 'object' && w['tags'] && !Array.isArray(w['tags'])
      ? (w['tags'] as Record<string, number>)
      : undefined;
  const position =
    typeof w['position'] === 'object' && w['position'] && !Array.isArray(w['position'])
      ? (w['position'] as Record<string, number>)
      : undefined;

  const useRating = w['useRating'] !== false;
  const useAttributes = w['useAttributes'] === true;
  const useStyleTags = w['useStyleTags'] === true;

  const rating = ratingNum ?? (useRating ? 1 : 0);
  const attribute = attributeNum ?? (useAttributes ? 1 : 0);

  const out: DrawWeightInput = { rating, attribute };
  if (tags && Object.keys(tags).length) {
    out.tags = tags;
  } else if (useStyleTags) {
    out.tags = { default: 1 };
  }
  if (position && Object.keys(position).length) {
    out.position = position;
  }

  if (
    rating === 0 &&
    attribute === 0 &&
    !out.tags &&
    !out.position
  ) {
    return { rating: 0, attribute: 0 };
  }
  return out;
}
