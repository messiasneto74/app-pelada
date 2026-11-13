import { describe, expect, it } from 'vitest';
import { shouldRunApiIntegration } from './should-run-api-integration.mjs';

describe('shouldRunApiIntegration', () => {
  it('retorna true com RUN_DB_TESTS=1 e DATABASE_URL_TEST', () => {
    expect(
      shouldRunApiIntegration({
        RUN_DB_TESTS: '1',
        DATABASE_URL_TEST: 'postgresql://x',
      }),
    ).toBe(true);
  });

  it('retorna false sem RUN_DB_TESTS', () => {
    expect(
      shouldRunApiIntegration({
        DATABASE_URL_TEST: 'postgresql://x',
      }),
    ).toBe(false);
  });
});
