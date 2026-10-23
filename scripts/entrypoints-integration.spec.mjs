import { afterEach, describe, expect, it, vi } from 'vitest';

describe('CLI entrypoints (integration)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('keycloak-reset.mjs runs with mocked docker', async () => {
    const execSync = vi.fn((cmd) => {
      if (String(cmd).includes('volume ls')) return 'pelada_pg_keycloak\n';
      return '';
    });
    vi.doMock('node:child_process', () => ({ execSync }));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await import('./keycloak-reset.mjs');
    expect(execSync).toHaveBeenCalled();
    log.mockRestore();
  });

  it('mark-issue-dod.mjs runs gh path with mocked spawn', async () => {
    vi.stubGlobal('process', {
      ...process,
      argv: ['node', 'mark-issue-dod.mjs', '99'],
    });
    const spawnSync = vi.fn((cmd, args) => {
      const joined = [cmd, ...(args ?? [])].join(' ');
      if (joined.includes('issue view')) {
        return {
          status: 0,
          stdout: JSON.stringify({
            title: 'T',
            body: '## Testes obrigatórios\n- [ ] x\n',
          }),
        };
      }
      return { status: 0, stdout: '' };
    });
    vi.doMock('node:child_process', () => ({ spawnSync }));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await import('./mark-issue-dod.mjs');
    expect(spawnSync).toHaveBeenCalled();
    log.mockRestore();
  });
});
