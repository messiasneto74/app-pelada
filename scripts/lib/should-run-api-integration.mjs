/** Suíte jest-integration só quando o harness Postgres está explícito (CI ou test:api:harness). */
export function shouldRunApiIntegration(env) {
  return env.RUN_DB_TESTS === '1' && Boolean(env.DATABASE_URL_TEST);
}
