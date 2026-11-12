import { describe, expect, it, vi } from 'vitest';
import { fetchHealth, waitForE2eStack } from './e2e-stack-ready.mjs';

describe('e2e-stack-ready', () => {
  it('fetchHealth ok', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    await fetchHealth('http://localhost:3000/health', fetchFn);
    expect(fetchFn).toHaveBeenCalled();
  });

  it('fetchHealth throws on status', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(fetchHealth('http://x/health', fetchFn)).rejects.toThrow('503');
  });

  it('runE2eStackReady logs and returns urls', async () => {
    const logs = [];
    const { runE2eStackReady } = await import('./e2e-stack-ready.mjs');
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const urls = await runE2eStackReady({
      fetchFn,
      checkWeb: true,
      maxAttempts: 1,
      delayMs: 0,
      log: (m) => logs.push(m),
    });
    expect(urls.apiUrl).toContain('3000');
    expect(logs.some((l) => l.includes('OK stack E2E'))).toBe(true);
  });

  it('waitForE2eStack succeeds when all targets respond', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const result = await waitForE2eStack({
      fetchFn,
      checkWeb: true,
      maxAttempts: 1,
      delayMs: 0,
    });
    expect(result.apiUrl).toContain('3000');
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
