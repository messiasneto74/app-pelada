import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatLocalDateInput, tomorrowLocalDateInput } from './e2e-local-date.mjs';

describe('e2e-local-date', () => {
  it('formatLocalDateInput usa calendário local', () => {
    const d = new Date(2026, 10, 9, 12, 0, 0);
    expect(formatLocalDateInput(d)).toBe('2026-11-09');
  });

  it('tomorrowLocalDateInput', () => {
    const d = new Date(2026, 10, 9, 12, 0, 0);
    expect(tomorrowLocalDateInput(d)).toBe('2026-11-10');
  });
});

describe('e2e-local-date (America/Sao_Paulo)', () => {
  let originalTz;

  beforeEach(() => {
    originalTz = process.env.TZ;
    process.env.TZ = 'America/Sao_Paulo';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T02:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it('23h30 BRT: amanhã local ≠ slice UTC do anti-padrão', () => {
    expect(formatLocalDateInput(new Date())).toBe('2026-11-09');
    expect(tomorrowLocalDateInput()).toBe('2026-11-10');

    const anti = new Date();
    anti.setDate(anti.getDate() + 1);
    const naiveUtc = anti.toISOString().slice(0, 10);
    expect(naiveUtc).toBe('2026-11-11');
    expect(tomorrowLocalDateInput()).not.toBe(naiveUtc);
  });
});
