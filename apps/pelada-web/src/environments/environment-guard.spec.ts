import { assertProductionEnvironmentConfigured } from './environment-guard';

describe('assertProductionEnvironmentConfigured (Médio)', () => {
  it('lança erro quando production=true e apiUrl é o placeholder', () => {
    expect(() =>
      assertProductionEnvironmentConfigured({
        production: true,
        apiUrl: 'https://api.example.com',
        keycloak: { url: 'https://auth.real.com' },
      }),
    ).toThrowError(/placeholder/);
  });

  it('lança erro quando production=true e keycloak.url é o placeholder', () => {
    expect(() =>
      assertProductionEnvironmentConfigured({
        production: true,
        apiUrl: 'https://api.real.com',
        keycloak: { url: 'https://auth.example.com' },
      }),
    ).toThrowError(/placeholder/);
  });

  it('não lança quando production=true com URLs reais', () => {
    expect(() =>
      assertProductionEnvironmentConfigured({
        production: true,
        apiUrl: 'https://api.real.com',
        keycloak: { url: 'https://auth.real.com' },
      }),
    ).not.toThrow();
  });

  it('não lança quando production=false, mesmo com URLs placeholder (dev local)', () => {
    expect(() =>
      assertProductionEnvironmentConfigured({
        production: false,
        apiUrl: 'https://api.example.com',
        keycloak: { url: 'https://auth.example.com' },
      }),
    ).not.toThrow();
  });
});
