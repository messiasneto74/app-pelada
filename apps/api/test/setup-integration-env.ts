import {
  JWT_TEST_ISSUER,
  JWT_TEST_PUBLIC_KEY_PEM,
} from './fixtures/jwt-test-keys';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

if (runHarness) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.DEV_AUTH_BYPASS = 'false';
  process.env.KEYCLOAK_ISSUER = JWT_TEST_ISSUER;
  process.env.JWT_TEST_PUBLIC_KEY = JWT_TEST_PUBLIC_KEY_PEM;
}
