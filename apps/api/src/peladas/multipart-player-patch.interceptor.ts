import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { normalizePatchPlayerBody } from '../common/normalize-patch-player-body';

/** Antes do ValidationPipe global — multipart chega com strings. */
@Injectable()
export class MultipartPlayerPatchInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      req.body = normalizePatchPlayerBody(
        req.body as Record<string, unknown>,
      );
    }
    return next.handle();
  }
}
