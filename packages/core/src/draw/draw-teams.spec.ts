import { describe, expect, it } from 'vitest';
import { drawTeams } from './draw-teams.js';
import { computeDrawBalanceMetrics } from './metrics.js';
import { computePlayerDrawScore } from './player-draw-score.js';
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

  it('sem goleiros: trata como linha apenas (compatível CORE-1)', () => {
    const players = Array.from({ length: 12 }, (_, i) => mk(i + 1, 5 + (i % 3)));
    const r = drawTeams({ players, teamCount: 3, mode: 'BALANCED', seed: 7 });
    expect(r.teams.map((t) => t.playerIds.length)).toEqual([4, 4, 4]);
  });
});

describe('drawTeams (CORE-2) — GK', () => {
  it('ONE_PER_TEAM exige goleiros suficientes quando explícito', () => {
    const players = [
      { id: 'p1', rating: 7, isGoalkeeper: true },
      { id: 'p2', rating: 7 },
      { id: 'p3', rating: 7 },
      { id: 'p4', rating: 7 },
    ];
    expect(() =>
      drawTeams({
        players,
        teamCount: 2,
        mode: 'BALANCED',
        goalkeepersMode: 'ONE_PER_TEAM',
      }),
    ).toThrow(DrawValidationError);
  });

  it('FIXED_OFF_LINE não coloca goleiros nos times sorteados', () => {
    const players = [
      { id: 'g1', rating: 8, isGoalkeeper: true },
      { id: 'g2', rating: 7, isGoalkeeper: true },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `p${i + 1}`,
        rating: 6 + (i % 3),
      })),
    ];
    const r = drawTeams({
      players,
      teamCount: 2,
      mode: 'BALANCED',
      goalkeepersMode: 'FIXED_OFF_LINE',
      seed: 11,
    });
    const allIds = r.teams.flatMap((t) => t.playerIds);
    expect(allIds).not.toContain('g1');
    expect(allIds).not.toContain('g2');
    expect(r.teams.map((t) => t.playerIds.length)).toEqual([4, 4]);
  });

  it('RANDOM + FIXED_OFF_LINE também exclui goleiros', () => {
    const players = [
      { id: 'gk', rating: 9, isGoalkeeper: true },
      ...Array.from({ length: 11 }, (_, i) => ({ id: `x${i}`, rating: 5 })),
    ];
    const r = drawTeams({
      players,
      teamCount: 3,
      mode: 'RANDOM',
      goalkeepersMode: 'FIXED_OFF_LINE',
      seed: 3,
    });
    expect(r.teams.flatMap((t) => t.playerIds)).not.toContain('gk');
  });
});

describe('drawTeams (CORE-2) — pesos', () => {
  it('pesos alteram pontuação efetiva e podem mudar o sorteio', () => {
    const players = [
      { id: 'a', rating: 5, attributeScore: 10 },
      { id: 'b', rating: 8, attributeScore: 2 },
      { id: 'c', rating: 6 },
      { id: 'd', rating: 6 },
    ];
    expect(computePlayerDrawScore(players[0], { rating: 1, attribute: 0 })).toBe(5);
    expect(computePlayerDrawScore(players[0], { rating: 1, attribute: 1 })).toBe(15);
    const wNote = drawTeams({
      players,
      teamCount: 2,
      mode: 'BALANCED',
      seed: 100,
      weights: { rating: 1, attribute: 0 },
    });
    const wAttr = drawTeams({
      players,
      teamCount: 2,
      mode: 'BALANCED',
      seed: 100,
      weights: { rating: 1, attribute: 1 },
    });
    expect(wNote.teams).not.toEqual(wAttr.teams);
  });

  it('métricas usam pontuação efetiva com tags/posição', () => {
    const players = [
      { id: 'p1', rating: 7, tags: ['veloz'], position: 'Ataque' },
      { id: 'p2', rating: 7 },
      { id: 'p3', rating: 7 },
      { id: 'p4', rating: 7 },
    ];
    const m = computeDrawBalanceMetrics(
      [
        ['p1', 'p2'],
        ['p3', 'p4'],
      ],
      players,
      { tags: { veloz: 2 }, position: { Ataque: 1 } },
    );
    expect(m.teamAverages[0]).toBeGreaterThan(m.teamAverages[1]);
  });
});
