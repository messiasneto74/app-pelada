import type { GoalkeeperMode } from '@prisma/client';
import { mapGoalkeeperMode, parseDrawWeights } from './match-draw-map.logic';

describe('match-draw-map.logic', () => {
  describe('mapGoalkeeperMode', () => {
    it.each<[GoalkeeperMode, 'ONE_PER_TEAM' | 'FIXED_OFF_LINE']>([
      ['FIXED_PER_TEAM', 'ONE_PER_TEAM'],
      ['ROTATING', 'FIXED_OFF_LINE'],
      ['FIXED_GLOBAL', 'FIXED_OFF_LINE'],
    ])('%s → %s', (mode, expected) => {
      expect(mapGoalkeeperMode(mode)).toBe(expected);
    });
  });

  describe('parseDrawWeights', () => {
    it('mapeia flags UI (useRating / useAttributes)', () => {
      expect(
        parseDrawWeights({
          useRating: false,
          useAttributes: true,
          useStyleTags: false,
        }),
      ).toEqual({ rating: 0, attribute: 1 });
    });

    it('preserva pesos numéricos legados', () => {
      expect(
        parseDrawWeights({ rating: 2, attribute: 0.5, tags: { forte: 1 } }),
      ).toEqual({ rating: 2, attribute: 0.5, tags: { forte: 1 } });
    });
  });
});
