import { describe, expect, it } from 'vitest';
import {
  buildStagingWebEnvironmentSource,
  resolveStagingWebEnvFromProcess,
} from './staging-web-env.mjs';

describe('staging-web-env', () => {
  it('resolveStagingWebEnvFromProcess lê STAGING_* ou PELADA_*', () => {
    const opts = resolveStagingWebEnvFromProcess({
      STAGING_PELADA_API_URL: 'https://api.staging.test/',
      STAGING_KEYCLOAK_URL: 'https://auth.staging.test',
      KEYCLOAK_REALM: 'pelada',
      KEYCLOAK_CLIENT_ID: 'pelada-web',
    });
    expect(opts.apiUrl).toBe('https://api.staging.test');
    expect(opts.keycloakUrl).toBe('https://auth.staging.test');
  });

  it('falha quando URLs ausentes', () => {
    expect(() => resolveStagingWebEnvFromProcess({})).toThrow(/obrigatórias/);
  });

  it('buildStagingWebEnvironmentSource emite TS válido', () => {
    const src = buildStagingWebEnvironmentSource({
      production: true,
      apiUrl: 'https://api.example.com',
      keycloakUrl: 'https://auth.example.com',
      realm: 'pelada',
      clientId: 'pelada-web',
    });
    expect(src).toContain("apiUrl: 'https://api.example.com'");
    expect(src).toContain("production: true");
  });
});
