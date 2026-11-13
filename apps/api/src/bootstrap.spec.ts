import { assertNoDevAuthBypassInProduction } from './bootstrap';

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
