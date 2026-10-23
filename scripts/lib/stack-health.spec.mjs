import { describe, expect, it, vi } from 'vitest';
import {
  assertHealthyApiBody,
  normalizeApiBase,
  waitForApiHealth,
} from './stack-health.mjs';

describe('stack-health', () => {
  it('normalizeApiBase trims slash', () => {
    expect(normalizeApiBase('http://localhost:3000/')).toBe('http://localhost:3000');
  });

  it('assertHealthyApiBody accepts ok', () => {
    expect(assertHealthyApiBody({ database: 'ok', status: 'ok' }).database).toBe('ok');
  });

  it('assertHealthyApiBody rejects bad database', () => {
    expect(() => assertHealthyApiBody({ database: 'down' })).toThrow(/database=down/);
  });

  it('waitForApiHealth succeeds on first try', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ database: 'ok' }),
    });
    const out = await waitForApiHealth({
      fetchFn,
      apiBase: 'http://localhost:3000',
      maxAttempts: 3,
      delayMs: 1,
    });
    expect(out.url).toBe('http://localhost:3000/health');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('waitForApiHealth retries then succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ database: 'ok' }),
      });
    await waitForApiHealth({
      fetchFn,
      apiBase: 'http://x',
      maxAttempts: 2,
      delayMs: 0,
      sleepFn: async () => {},
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('waitForApiHealth retries on HTTP error', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ database: 'ok' }),
      });
    await waitForApiHealth({
      fetchFn,
      apiBase: 'http://x',
      maxAttempts: 2,
      delayMs: 0,
      sleepFn: async () => {},
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('waitForApiHealth throws after max attempts', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(
      waitForApiHealth({
        fetchFn,
        apiBase: 'http://x',
        maxAttempts: 2,
        delayMs: 0,
        sleepFn: async () => {},
      }),
    ).rejects.toThrow('fail');
  });
});
