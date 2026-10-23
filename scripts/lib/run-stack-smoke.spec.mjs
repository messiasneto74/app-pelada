import { describe, expect, it, vi } from 'vitest';
import { runStackSmoke } from './run-stack-smoke.mjs';

describe('runStackSmoke', () => {
  it('returns true on healthy API', async () => {
    const log = vi.fn();
    const ok = await runStackSmoke({
      apiBase: 'http://localhost:3000',
      maxAttempts: 1,
      delayMs: 0,
      fetchFn: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ database: 'ok' }),
      }),
      log,
    });
    expect(ok).toBe(true);
    expect(log).toHaveBeenCalled();
  });

  it('uses global fetch when fetchFn omitted', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ database: 'ok' }),
    });
    try {
      const ok = await runStackSmoke({ maxAttempts: 1, delayMs: 0, log: () => {} });
      expect(ok).toBe(true);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('calls onFatal when API fails', async () => {
    const onFatal = vi.fn();
    const ok = await runStackSmoke({
      maxAttempts: 1,
      delayMs: 0,
      fetchFn: vi.fn().mockRejectedValue(new Error('net')),
      onFatal,
      error: () => {},
    });
    expect(ok).toBe(false);
    expect(onFatal).toHaveBeenCalled();
  });
});
