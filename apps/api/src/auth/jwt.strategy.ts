import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUserPayload } from './auth-user';

type KeycloakAccessToken = {
  sub: string;
  email?: string;
  preferred_username?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const issuer = config.getOrThrow<string>('KEYCLOAK_ISSUER');
    const testPublicKey = config.get<string>('JWT_TEST_PUBLIC_KEY');

    const baseOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      algorithms: ['RS256' as const],
    };

    if (testPublicKey) {
      super({
        ...baseOptions,
        secretOrKey: testPublicKey.replace(/\\n/g, '\n'),
      });
      return;
    }

    const jwksUri =
      config.get<string>('KEYCLOAK_JWKS_URI') ??
      `${issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`;

    super({
      ...baseOptions,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });
  }

  validate(payload: KeycloakAccessToken): AuthUserPayload {
    return {
      sub: payload.sub,
      email: payload.email,
    };
  }
}
