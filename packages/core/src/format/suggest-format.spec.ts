import { describe, expect, it } from 'vitest';
import { computeIdealCapacity } from './capacity.js';
import { suggestFormat } from './suggest-format.js';

const defaultRules = {
  playersPerTeam: 6,
  teamCount: 2,
  capacity: null as number | null,
};

describe('computeIdealCapacity', () => {
  it('usa capacity explícita quando definida', () => {
    expect(
      computeIdealCapacity({ playersPerTeam: 6, teamCount: 2, capacity: 14 }),
    ).toBe(14);
  });

  it('calcula fallback playersPerTeam × teamCount × 2', () => {
    expect(computeIdealCapacity(defaultRules)).toBe(24);
  });
});

describe('suggestFormat', () => {
  it('não alerta quando confirmados = capacidade ideal', () => {
    const result = suggestFormat(24, defaultRules);
    expect(result.mismatch).toBe(false);
    expect(result.delta).toBe(0);
    expect(result.options).toHaveLength(0);
  });

  it('sugere partida parcial quando vier menos gente', () => {
    const result = suggestFormat(18, defaultRules);
    expect(result.mismatch).toBe(true);
    expect(result.delta).toBe(-6);
    expect(result.options[0]?.id).toBe('partial-keep-rules');
    const nearest = result.options.find((o) => o.id.startsWith('nearest-'));
    expect(nearest?.proposedRules).toEqual({
      playersPerTeam: 5,
      teamCount: 2,
      capacity: 20,
    });
  });

  it('sugere fila quando vier mais gente sem combinação exata', () => {
    const result = suggestFormat(26, defaultRules);
    expect(result.mismatch).toBe(true);
    expect(result.delta).toBe(2);
    expect(result.options[0]?.id).toBe('queue-keep-rules');
    expect(result.options.some((o) => o.id.startsWith('nearest-'))).toBe(false);
  });

  it('inclui ajuste exato quando existe combinação para o elenco', () => {
    const result = suggestFormat(20, defaultRules);
    const adjust = result.options.find((o) => o.id.startsWith('adjust-'));
    expect(adjust?.proposedRules).toEqual({
      playersPerTeam: 5,
      teamCount: 2,
      capacity: 20,
    });
  });
});
