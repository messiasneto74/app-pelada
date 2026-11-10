import { describe, expect, it } from 'vitest';
import { formatLocalDateInput, tomorrowLocalDateInput } from './e2e-local-date.mjs';

describe('e2e-local-date', () => {
  it('formatLocalDateInput usa calendário local (not UTC slice)', () => {
    const d = new Date(2026, 10, 9, 23, 30, 0);
    expect(formatLocalDateInput(d)).toBe('2026-11-09');
    expect(d.toISOString().slice(0, 10)).not.toBe('2026-11-09');
  });

  it('tomorrowLocalDateInput', () => {
    const d = new Date(2026, 10, 9, 12, 0, 0);
    expect(tomorrowLocalDateInput(d)).toBe('2026-11-10');
  });
});
