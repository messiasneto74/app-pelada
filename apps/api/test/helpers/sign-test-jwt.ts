import jwt from 'jsonwebtoken';
import {
  JWT_TEST_ISSUER,
  JWT_TEST_PRIVATE_KEY_PEM,
} from '../fixtures/jwt-test-keys';

export type TestJwtClaims = {
  sub: string;
  email?: string;
};

export function signTestJwt(claims: TestJwtClaims): string {
  return jwt.sign(
    {
      sub: claims.sub,
      email: claims.email ?? `${claims.sub}@pelada.test`,
    },
    JWT_TEST_PRIVATE_KEY_PEM,
    {
      algorithm: 'RS256',
      issuer: JWT_TEST_ISSUER,
      expiresIn: '1h',
    },
  );
}
