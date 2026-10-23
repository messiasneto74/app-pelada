import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  resolveDatabaseUrlTest,
  runDbTestMigrate,
} from './run-db-test-migrate.mjs';

describe('resolveDatabaseUrlTest', () => {
  it('returns error when DATABASE_URL_TEST missing', () => {
    const result = resolveDatabaseUrlTest({
      repoRoot: '/repo',
      envPath: '/repo/.env.missing',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/DATABASE_URL_TEST/);
  });

  it('reads DATABASE_URL_TEST from process.env', () => {
    const prev = process.env.DATABASE_URL_TEST;
    process.env.DATABASE_URL_TEST = 'postgresql://test';
    try {
      const result = resolveDatabaseUrlTest({
        repoRoot: '/repo',
        envPath: '/repo/.env',
      });
      expect(result).toEqual({
        ok: true,
        databaseUrl: 'postgresql://test',
      });
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL_TEST;
      else process.env.DATABASE_URL_TEST = prev;
    }
  });
});

describe('runDbTestMigrate', () => {
  it('runs prisma migrate deploy with DATABASE_URL override', () => {
    const spawnSyncFn = vi.fn().mockReturnValue({ status: 0 });
    const status = runDbTestMigrate({
      repoRoot: '/repo',
      databaseUrl: 'postgresql://migrate',
      execPath: '/node',
      prismaCli: '/prisma.js',
      env: { FOO: 'bar' },
      spawnSyncFn,
    });
    expect(status).toBe(0);
    expect(spawnSyncFn).toHaveBeenCalledWith(
      '/node',
      ['/prisma.js', 'migrate', 'deploy'],
      {
        cwd: path.join('/repo', 'apps', 'api'),
        env: { FOO: 'bar', DATABASE_URL: 'postgresql://migrate' },
        stdio: 'inherit',
      },
    );
  });

  it('returns 1 when spawn has no status', () => {
    const spawnSyncFn = vi.fn().mockReturnValue({});
    expect(
      runDbTestMigrate({
        repoRoot: '/repo',
        databaseUrl: 'postgresql://x',
        spawnSyncFn,
      }),
    ).toBe(1);
  });
});
