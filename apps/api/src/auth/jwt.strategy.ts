import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUserPayload } from './auth-user';

type KeycloakAccessToken = {
  sub: string;
  email?: string;
  preferred_username?: string;
  azp?: string;
  aud?: string | string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly expectedClientId?: string;

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
      this.expectedClientId = config.get<string>('KEYCLOAK_CLIENT_ID');
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
    this.expectedClientId = config.get<string>('KEYCLOAK_CLIENT_ID');
  }

  validate(payload: KeycloakAccessToken): AuthUserPayload {
    if (this.expectedClientId && !this.isForExpectedClient(payload)) {
      throw new UnauthorizedException(
        'Token emitido para um client não autorizado.',
      );
    }
    return {
      sub: payload.sub,
      email: payload.email,
    };
  }

  private isForExpectedClient(payload: KeycloakAccessToken): boolean {
    if (payload.azp === this.expectedClientId) {
      return true;
    }
    const aud = payload.aud;
    return Array.isArray(aud)
      ? aud.includes(this.expectedClientId as string)
      : aud === this.expectedClientId;
  }
}
