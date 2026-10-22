import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUserPayload } from './auth-user';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUserPayload;
    }>();

    if (this.isDevBypassEnabled()) {
      const auth = request.headers.authorization;
      if (auth?.match(/^Bearer\s+/i)) {
        request.user = {
          sub: this.config.get<string>('DEV_AUTH_SUB') ?? 'dev-local-sub',
          email: 'dev@pelada.local',
        };
        return true;
      }
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUserPayload>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or missing token');
    }
    return user;
  }

  private isDevBypassEnabled(): boolean {
    return this.config.get<string>('DEV_AUTH_BYPASS') === 'true';
  }
}
