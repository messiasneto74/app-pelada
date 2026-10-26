import { afterEach, describe, expect, it, vi } from 'vitest';

describe('scripts CLI entrypoints', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('stack-smoke.mjs wires runStackSmoke', async () => {
    const runStackSmoke = vi.fn().mockResolvedValue(true);
    vi.doMock('./lib/run-stack-smoke.mjs', () => ({ runStackSmoke }));
    await import('./stack-smoke.mjs');
    expect(runStackSmoke).toHaveBeenCalled();
  });

  it('keycloak-smoke.mjs wires runKeycloakSmoke', async () => {
    const runKeycloakSmoke = vi.fn().mockResolvedValue(true);
    vi.doMock('./lib/run-keycloak-smoke.mjs', () => ({ runKeycloakSmoke }));
    await import('./keycloak-smoke.mjs');
    expect(runKeycloakSmoke).toHaveBeenCalled();
  });

  it('keycloak-reset.mjs wires resetKeycloakDev', async () => {
    const resetKeycloakDev = vi.fn();
    vi.doMock('./lib/keycloak-reset-dev.mjs', () => ({
      listKeycloakVolumesFromExec: () => [],
      resetKeycloakDev,
    }));
    vi.doMock('node:child_process', () => ({ execSync: vi.fn() }));
    await import('./keycloak-reset.mjs');
    expect(resetKeycloakDev).toHaveBeenCalled();
  });

  it('db-test-up.mjs wires runDbTestUp', async () => {
    const runDbTestUp = vi.fn().mockReturnValue(0);
    vi.doMock('./lib/run-db-test-up.mjs', () => ({ runDbTestUp }));
    vi.stubGlobal('process', {
      ...process,
      exit: vi.fn(),
    });
    await import('./db-test-up.mjs');
    expect(runDbTestUp).toHaveBeenCalled();
  });

  it('db-test-migrate.mjs wires runDbTestMigrate', async () => {
    const runDbTestMigrate = vi.fn().mockReturnValue(0);
    vi.doMock('./lib/run-db-test-migrate.mjs', () => ({
      resolveDatabaseUrlTest: () => ({
        ok: true,
        databaseUrl: 'postgresql://x',
      }),
      runDbTestMigrate,
    }));
    vi.stubGlobal('process', {
      ...process,
      exit: vi.fn(),
    });
    await import('./db-test-migrate.mjs');
    expect(runDbTestMigrate).toHaveBeenCalledWith(
      expect.objectContaining({ databaseUrl: 'postgresql://x' }),
    );
  });

  it('mark-issue-dod.mjs with args calls markIssuesDod', async () => {
    const markIssuesDod = vi.fn();
    vi.stubGlobal('process', {
      ...process,
      argv: ['node', 'mark-issue-dod.mjs', '8'],
      exit: vi.fn(),
    });
    vi.doMock('./lib/mark-issue-dod-runner.mjs', () => ({
      DEFAULT_REPO: 'messiasneto74/app-pelada',
      markIssuesDod,
      parseIssueNumbers: (a) => a.map(Number).filter(Boolean),
    }));
    vi.doMock('node:child_process', () => ({ spawnSync: vi.fn() }));
    await import('./mark-issue-dod.mjs');
    expect(markIssuesDod).toHaveBeenCalledWith([8], expect.objectContaining({ gh: expect.any(Function) }));
  });

  it('mark-issue-dod.mjs without args exits', async () => {
    const exit = vi.fn();
    vi.stubGlobal('process', { ...process, argv: ['node', 'script'], exit });
    vi.doMock('./lib/mark-issue-dod-runner.mjs', () => ({
      DEFAULT_REPO: 'messiasneto74/app-pelada',
      markIssuesDod: vi.fn(),
      parseIssueNumbers: () => [],
    }));
    vi.doMock('node:child_process', () => ({ spawnSync: vi.fn() }));
    await import('./mark-issue-dod.mjs');
    expect(exit).toHaveBeenCalledWith(1);
  });
});
