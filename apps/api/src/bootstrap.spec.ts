import {
  assertKeycloakClientIdConfiguredInProduction,
  assertNoDevAuthBypassInProduction,
  resolveTrustProxySetting,
} from './bootstrap';

describe('assertNoDevAuthBypassInProduction (Médio)', () => {
  it('lança se DEV_AUTH_BYPASS=true e NODE_ENV=production', () => {
    expect(() =>
      assertNoDevAuthBypassInProduction({
        NODE_ENV: 'production',
        DEV_AUTH_BYPASS: 'true',
      }),
    ).toThrow(/DEV_AUTH_BYPASS/);
  });

  it('permite DEV_AUTH_BYPASS=true fora de produção', () => {
    expect(() =>
      assertNoDevAuthBypassInProduction({
        NODE_ENV: 'development',
        DEV_AUTH_BYPASS: 'true',
      }),
    ).not.toThrow();
  });

  it('permite NODE_ENV=production sem bypass', () => {
    expect(() =>
      assertNoDevAuthBypassInProduction({
        NODE_ENV: 'production',
        DEV_AUTH_BYPASS: 'false',
      }),
    ).not.toThrow();
    expect(() =>
      assertNoDevAuthBypassInProduction({ NODE_ENV: 'production' }),
    ).not.toThrow();
  });
});

describe('assertKeycloakClientIdConfiguredInProduction (achado de segurança do Codex no PR #128)', () => {
  it('lança se NODE_ENV=production sem KEYCLOAK_CLIENT_ID', () => {
    expect(() =>
      assertKeycloakClientIdConfiguredInProduction({ NODE_ENV: 'production' }),
    ).toThrow(/KEYCLOAK_CLIENT_ID/);
  });

  it('lança se NODE_ENV=production com KEYCLOAK_CLIENT_ID vazio/espaços', () => {
    expect(() =>
      assertKeycloakClientIdConfiguredInProduction({
        NODE_ENV: 'production',
        KEYCLOAK_CLIENT_ID: '   ',
      }),
    ).toThrow(/KEYCLOAK_CLIENT_ID/);
  });

  it('permite produção com KEYCLOAK_CLIENT_ID definido', () => {
    expect(() =>
      assertKeycloakClientIdConfiguredInProduction({
        NODE_ENV: 'production',
        KEYCLOAK_CLIENT_ID: 'pelada-web',
      }),
    ).not.toThrow();
  });

  it('permite ausência de KEYCLOAK_CLIENT_ID fora de produção', () => {
    expect(() =>
      assertKeycloakClientIdConfiguredInProduction({ NODE_ENV: 'development' }),
    ).not.toThrow();
  });
});

describe('resolveTrustProxySetting (achado de segurança do Codex no PR #129)', () => {
  it('desativado por padrão (sem TRUST_PROXY)', () => {
    expect(resolveTrustProxySetting({})).toBe(false);
  });

  it('desativado para qualquer valor que não seja "true"/"1"', () => {
    expect(resolveTrustProxySetting({ TRUST_PROXY: 'false' })).toBe(false);
    expect(resolveTrustProxySetting({ TRUST_PROXY: 'yes' })).toBe(false);
  });

  it('ativado (1 hop) com TRUST_PROXY=true ou "1"', () => {
    expect(resolveTrustProxySetting({ TRUST_PROXY: 'true' })).toBe(1);
    expect(resolveTrustProxySetting({ TRUST_PROXY: '1' })).toBe(1);
  });
});
