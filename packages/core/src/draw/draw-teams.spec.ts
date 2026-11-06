import { describe, expect, it } from 'vitest';
import { drawTeams } from './draw-teams.js';
import { computeDrawBalanceMetrics } from './metrics.js';
import { DrawValidationError } from './types.js';

const mk = (n: number, rating: number, gk = false) => ({
  id: `p${n}`,
  rating,
  isGoalkeeper: gk,
});

describe('computeDrawBalanceMetrics', () => {
  it('score 100 quando médias iguais', () => {
    const players = [mk(1, 7), mk(2, 7), mk(3, 7), mk(4, 7)];
    const m = computeDrawBalanceMetrics(
      [
        ['p1', 'p2'],
        ['p3', 'p4'],
      ],
      players,
    );
    expect(m.balanceScore).toBe(100);
    expect(m.maxAverageDiff).toBe(0);
  });
});

describe('drawTeams (CORE-1)', () => {
  it('modo BALANCED distribui por nota (seed fixo)', () => {
    const players = [
      mk(1, 9),
      mk(2, 8),
      mk(3, 5),
      mk(4, 4),
      mk(5, 7, true),
      mk(6, 6, true),
    ];
    const a = drawTeams({
      players,
      teamCount: 2,
      mode: 'BALANCED',
      seed: 42,
    });
    const b = drawTeams({
      players,
      teamCount: 2,
      mode: 'BALANCED',
      seed: 42,
    });
    expect(a.teams).toEqual(b.teams);
    expect(a.metrics.balanceScore).toBeGreaterThan(50);
    expect(a.teams.every((t) => t.playerIds.length === 3)).toBe(true);
  });

  it('modo RANDOM é reprodutível com seed', () => {
    const players = Array.from({ length: 12 }, (_, i) => mk(i + 1, 5 + (i % 3)));
    const r1 = drawTeams({ players, teamCount: 3, mode: 'RANDOM', seed: 99 });
    const r2 = drawTeams({ players, teamCount: 3, mode: 'RANDOM', seed: 99 });
    expect(r1.teams).toEqual(r2.teams);
  });

  it('21 jogadores em 3 times (7 cada)', () => {
    const players = Array.from({ length: 21 }, (_, i) => mk(i + 1, 6 + (i % 4) * 0.5));
    const result = drawTeams({
      players,
      teamCount: 3,
      mode: 'BALANCED',
      seed: 1,
    });
    expect(result.teams).toHaveLength(3);
    expect(result.teams.map((t) => t.playerIds.length)).toEqual([7, 7, 7]);
  });

  it('rejeita elenco insuficiente', () => {
    expect(() =>
      drawTeams({
        players: [mk(1, 7), mk(2, 7), mk(3, 7)],
        teamCount: 2,
        mode: 'BALANCED',
      }),
    ).toThrow(DrawValidationError);
  });
});
