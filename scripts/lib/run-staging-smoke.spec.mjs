import { describe, expect, it, vi } from 'vitest';
import { runStagingSmoke } from './run-staging-smoke.mjs';

describe('run-staging-smoke', () => {
  it('exige URLs configuradas', async () => {
    const onFatal = vi.fn();
    const ok = await runStagingSmoke({
      apiBase: '',
      issuer: '',
      onFatal,
      log: () => {},
      error: () => {},
    });
    expect(ok).toBe(false);
    expect(onFatal).toHaveBeenCalled();
  });

  it('conclui quando API e Keycloak respondem', async () => {
    const ok = await runStagingSmoke({
      apiBase: 'https://api.test',
      issuer: 'https://auth.test/realms/pelada',
      waitForApiHealthFn: async () => ({ url: '/health', body: { ok: true } }),
      waitForKeycloakMetadataFn: async () => ({ issuer: 'https://auth.test/realms/pelada' }),
      log: () => {},
      error: () => {},
      onFatal: () => {},
    });
    expect(ok).toBe(true);
  });
});
