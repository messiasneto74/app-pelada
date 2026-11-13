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

  it('monthUtcBounds cobre o mês civil no fuso de Brasília (UTC-3)', () => {
    const { start, end } = monthUtcBounds(new Date('2026-11-15T12:00:00.000Z'));
    expect(start.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });

  it('pagamento feito às 22h de Brasília no último dia do mês cai no mês certo (M5)', () => {
    // 2026-11-30T22:00:00 em Brasília (UTC-3) == 2026-12-01T01:00:00Z,
    // já em dezembro em UTC puro, mas ainda 30/11 no fuso local.
    const paidAt = new Date('2026-12-01T01:00:00.000Z');
    const november = monthUtcBounds(new Date('2026-11-15T12:00:00.000Z'));
    const december = monthUtcBounds(new Date('2026-12-15T12:00:00.000Z'));

    expect(paidAt >= november.start && paidAt < november.end).toBe(true);
    expect(paidAt >= december.start && paidAt < december.end).toBe(false);
  });
});
