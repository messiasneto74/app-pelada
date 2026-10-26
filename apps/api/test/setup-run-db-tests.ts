import {
  JWT_TEST_ISSUER,
  JWT_TEST_PUBLIC_KEY_PEM,
} from './fixtures/jwt-test-keys';

/** Com RUN_DB_TESTS=1, toda a suíte API usa Postgres de teste (5435), não dev (5433). */
if (process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.DEV_AUTH_BYPASS = 'false';
  process.env.KEYCLOAK_ISSUER = JWT_TEST_ISSUER;
  process.env.JWT_TEST_PUBLIC_KEY = JWT_TEST_PUBLIC_KEY_PEM;
}
