import { describe, expect, it, vi } from 'vitest';
import {
  listKeycloakVolumesFromExec,
  resetKeycloakDev,
} from './keycloak-reset-dev.mjs';

describe('keycloak-reset-dev', () => {
  it('listKeycloakVolumesFromExec', () => {
    const exec = vi.fn().mockReturnValue('pelada_pg_keycloak\n');
    expect(listKeycloakVolumesFromExec(exec, '/tmp')).toEqual(['pelada_pg_keycloak']);
  });

  it('listKeycloakVolumesFromExec on error', () => {
    const exec = vi.fn().mockImplementation(() => {
      throw new Error('docker');
    });
    expect(listKeycloakVolumesFromExec(exec, '/tmp')).toEqual([]);
  });

  it('resetKeycloakDev removes volumes', () => {
    const run = vi.fn();
    const log = vi.fn();
    const ok = resetKeycloakDev({
      run,
      listVolumes: () => ['pelada_pg_keycloak'],
      log,
    });
    expect(ok).toBe(true);
    expect(run).toHaveBeenCalledWith('docker volume rm pelada_pg_keycloak');
  });

  it('resetKeycloakDev no volumes', () => {
    const run = vi.fn();
    resetKeycloakDev({ run, listVolumes: () => [], log: () => {} });
    expect(run).not.toHaveBeenCalledWith(expect.stringContaining('volume rm'));
  });

  it('resetKeycloakDev volume rm failure', () => {
    const onFatal = vi.fn();
    const run = vi.fn((cmd) => {
      if (cmd.includes('volume rm')) throw new Error('in use');
    });
    const ok = resetKeycloakDev({
      run,
      listVolumes: () => ['v'],
      log: () => {},
      error: () => {},
      onFatal,
    });
    expect(ok).toBe(false);
    expect(onFatal).toHaveBeenCalled();
  });
});
