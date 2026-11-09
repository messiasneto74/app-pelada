const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

if (!runHarness) {
  describe('API integração Postgres (gate)', () => {
    it('exige RUN_DB_TESTS=1 e DATABASE_URL_TEST (CI: pr-tests.yml)', () => {
      throw new Error(
        'Suíte de integração requer RUN_DB_TESTS=1 e DATABASE_URL_TEST. ' +
          'No CI isso é injetado no job test:all + R-07; localmente use npm run test:api:harness.',
      );
    });
  });
}
