import { computeMatchCapacity, monthUtcBounds } from './pelada-dashboard.logic';

describe('pelada-dashboard.logic', () => {
  it('usa capacity das regras quando definida', () => {
    expect(
      computeMatchCapacity({
        capacity: 14,
        playersPerTeam: 6,
        teamCount: 2,
      }),
    ).toBe(14);
  });

  it('calcula capacity padrão por times', () => {
    expect(
      computeMatchCapacity({
        capacity: null,
        playersPerTeam: 6,
        teamCount: 2,
      }),
    ).toBe(24);
  });

  it('monthUtcBounds cobre o mês civil UTC', () => {
    const { start, end } = monthUtcBounds(new Date('2026-11-15T12:00:00.000Z'));
    expect(start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});
