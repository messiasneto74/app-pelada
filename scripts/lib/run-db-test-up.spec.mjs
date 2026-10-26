import { describe, expect, it, vi } from 'vitest';
import { runDbTestUp } from './run-db-test-up.mjs';

describe('runDbTestUp', () => {
  it('runs docker compose up postgres-app-test', () => {
    const spawnSyncFn = vi.fn().mockReturnValue({ status: 0 });
    const status = runDbTestUp({
      repoRoot: '/repo',
      dockerBin: 'C:\\docker.exe',
      spawnSyncFn,
    });
    expect(status).toBe(0);
    expect(spawnSyncFn).toHaveBeenCalledWith(
      'C:\\docker.exe',
      ['compose', 'up', '-d', 'postgres-app-test'],
      expect.objectContaining({ cwd: '/repo' }),
    );
  });
});
