import jwt from 'jsonwebtoken';
import { JWT_TEST_ISSUER, JWT_TEST_PUBLIC_KEY_PEM } from '../fixtures/jwt-test-keys';
import { signTestJwt } from './sign-test-jwt';

describe('signTestJwt', () => {
  it('emits RS256 token with issuer and sub', () => {
    const token = signTestJwt({ sub: 'unit-sub', email: 'a@b.test' });
    const payload = jwt.verify(token, JWT_TEST_PUBLIC_KEY_PEM, {
      algorithms: ['RS256'],
      issuer: JWT_TEST_ISSUER,
    }) as { sub: string; email: string };

    expect(payload.sub).toBe('unit-sub');
    expect(payload.email).toBe('a@b.test');
  });
});
