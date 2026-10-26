import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveDockerExecutable', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.doUnmock('node:fs');
  });

  it('returns docker on linux', async () => {
    vi.stubGlobal('process', { ...process, platform: 'linux' });
    const { resolveDockerExecutable } = await import('./docker-cli.mjs');
    expect(resolveDockerExecutable()).toBe('docker');
  });

  it('returns first existing docker.exe on win32', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'win32',
      env: { ...process.env, ProgramFiles: 'C:\\Program Files' },
    });
    vi.doMock('node:fs', () => ({
      existsSync: (p) => String(p).includes('resources\\bin\\docker.exe'),
    }));
    const { resolveDockerExecutable } = await import('./docker-cli.mjs');
    expect(resolveDockerExecutable()).toBe(
      'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    );
  });

  it('falls back to docker on win32 when Desktop paths missing', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'win32',
      env: { ...process.env, ProgramFiles: 'C:\\Program Files' },
    });
    vi.doMock('node:fs', () => ({
      existsSync: () => false,
    }));
    const { resolveDockerExecutable } = await import('./docker-cli.mjs');
    expect(resolveDockerExecutable()).toBe('docker');
  });
});
