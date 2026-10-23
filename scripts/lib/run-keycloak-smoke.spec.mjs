import { describe, expect, it, vi } from 'vitest';
import { runKeycloakSmoke } from './run-keycloak-smoke.mjs';

const metadata = {
  issuer: 'http://localhost:8080/realms/pelada',
  jwks_uri: 'http://localhost:8080/realms/pelada/protocol/openid-connect/certs',
};

describe('runKeycloakSmoke', () => {
  it('success path', async () => {
    const log = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const ok = await runKeycloakSmoke({
      issuer: 'http://localhost:8080/realms/pelada',
      maxAttempts: 1,
      delayMs: 0,
      fetchJson: async () => metadata,
      fetchFn,
      log,
      warn: () => {},
    });
    expect(ok).toBe(true);
    expect(log).toHaveBeenCalledWith('OK Keycloak smoke');
  });

  it('onFatal when metadata fails', async () => {
    const onFatal = vi.fn();
    const ok = await runKeycloakSmoke({
      maxAttempts: 1,
      delayMs: 0,
      fetchJson: async () => {
        throw new Error('fail');
      },
      onFatal,
      error: () => {},
    });
    expect(ok).toBe(false);
    expect(onFatal).toHaveBeenCalled();
  });

  it('invokes sleepFn between retries (line 37)', async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const fetchJson = vi
      .fn()
      .mockRejectedValueOnce(new Error('retry'))
      .mockResolvedValueOnce(metadata);
    await runKeycloakSmoke({
      issuer: 'http://localhost:8080/realms/pelada',
      maxAttempts: 2,
      delayMs: 42,
      sleepFn,
      fetchJson,
      fetchFn: vi.fn().mockResolvedValue({ ok: true }),
      log: () => {},
      warn: () => {},
    });
    expect(sleepFn).toHaveBeenCalledWith(42);
  });

  it('built-in fetchJson rejects non-OK HTTP', async () => {
    const onFatal = vi.fn();
    await runKeycloakSmoke({
      maxAttempts: 1,
      delayMs: 0,
      fetchFn: vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      onFatal,
      error: () => {},
    });
    expect(onFatal).toHaveBeenCalled();
  });

  it('uses built-in fetchJson via fetchFn', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => metadata,
      })
      .mockResolvedValueOnce({ ok: true });
    const ok = await runKeycloakSmoke({
      issuer: 'http://localhost:8080/realms/pelada',
      maxAttempts: 1,
      delayMs: 0,
      fetchFn,
      log: () => {},
      warn: () => {},
    });
    expect(ok).toBe(true);
    expect(fetchFn).toHaveBeenCalled();
  });

  it('warns when health ready fails', async () => {
    const warn = vi.fn();
    await runKeycloakSmoke({
      issuer: 'http://localhost:8080/realms/pelada',
      maxAttempts: 1,
      delayMs: 0,
      fetchJson: async () => metadata,
      fetchFn: vi.fn().mockRejectedValue(new Error('no health')),
      log: () => {},
      warn,
    });
    expect(warn).toHaveBeenCalledWith(
      'Aviso: health check indisponível (realm OIDC OK)',
    );
  });
});
