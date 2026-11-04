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

  it('sugere atualizar capacity quando ppt/tc já batem mas capacidade manual não', () => {
    const rules = {
      playersPerTeam: 5,
      teamCount: 2,
      capacity: 14,
    };
    const result = suggestFormat(20, rules);
    const adjust = result.options.find(
      (o) =>
        o.proposedRules?.capacity === 20 &&
        o.proposedRules?.playersPerTeam === 5 &&
        o.proposedRules?.teamCount === 2,
    );
    expect(adjust).toBeDefined();
  });

  it('não propõe capacity acima do teto da API (40)', () => {
    const result = suggestFormat(50, defaultRules);
    for (const opt of result.options) {
      const cap = opt.proposedRules?.capacity;
      if (typeof cap === 'number') {
        expect(cap).toBeLessThanOrEqual(40);
        expect(cap).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('propõe até 40 confirmados dentro do domínio da API', () => {
    const result = suggestFormat(40, defaultRules);
    const adjust = result.options.find((o) => o.proposedRules?.capacity === 40);
    expect(adjust).toBeDefined();
  });

  it('elenco 44 (11×3) não propõe PATCH inválido (capacity 44 ou efetiva > 40)', () => {
    const result = suggestFormat(44, {
      playersPerTeam: 11,
      teamCount: 3,
      capacity: null,
    });
    for (const opt of result.options) {
      const pr = opt.proposedRules;
      if (!pr) {
        continue;
      }
      if (typeof pr.capacity === 'number') {
        expect(pr.capacity).toBeGreaterThanOrEqual(4);
        expect(pr.capacity).toBeLessThanOrEqual(40);
      }
      const effective =
        typeof pr.capacity === 'number' && pr.capacity > 0
          ? pr.capacity
          : pr.playersPerTeam * pr.teamCount * 2;
      expect(effective).toBeLessThanOrEqual(40);
    }
    expect(
      result.options.some((o) => o.proposedRules?.capacity === 44),
    ).toBe(false);
  });
});
