import { describe, expect, it, vi } from 'vitest';
import {
  formatCredentialHints,
  validateKeycloakMetadata,
  waitForKeycloakMetadata,
  wellKnownUrl,
} from './keycloak-metadata.mjs';

describe('keycloak-metadata', () => {
  it('wellKnownUrl', () => {
    expect(wellKnownUrl('http://localhost:8080/realms/pelada/')).toContain(
      '/.well-known/openid-configuration',
    );
  });

  it('validateKeycloakMetadata ok', () => {
    const m = validateKeycloakMetadata(
      {
        issuer: 'http://localhost:8080/realms/pelada',
        jwks_uri: 'http://localhost:8080/realms/pelada/protocol/openid-connect/certs',
      },
      'http://localhost:8080/realms/pelada',
    );
    expect(m.jwks_uri).toContain('certs');
  });

  it('validateKeycloakMetadata issuer mismatch', () => {
    expect(() =>
      validateKeycloakMetadata(
        {
          issuer: 'http://other',
          jwks_uri: 'http://x/protocol/openid-connect/certs',
        },
        'http://localhost:8080/realms/pelada',
      ),
    ).toThrow(/issuer esperado/);
  });

  it('validateKeycloakMetadata invalid jwks', () => {
    expect(() =>
      validateKeycloakMetadata({ issuer: 'http://localhost:8080/realms/pelada' }, 'http://localhost:8080/realms/pelada'),
    ).toThrow(/jwks_uri/);
  });

  it('formatCredentialHints', () => {
    const h = formatCredentialHints('admin', 'secret');
    expect(h.adminLine).toContain('admin / secret');
    expect(h.appLine).toContain('dev-pelada-local');
  });

  it('waitForKeycloakMetadata retries', async () => {
    const fetchJson = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({
        issuer: 'http://localhost:8080/realms/pelada',
        jwks_uri: 'http://localhost:8080/realms/pelada/protocol/openid-connect/certs',
      });
    const meta = await waitForKeycloakMetadata({
      fetchJson,
      issuer: 'http://localhost:8080/realms/pelada',
      maxAttempts: 2,
      delayMs: 0,
      sleepFn: async () => {},
    });
    expect(meta.issuer).toContain('pelada');
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });
});
