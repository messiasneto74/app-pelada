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
