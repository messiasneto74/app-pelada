import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LiveEventsService, liveEventFromRequest } from './live-events.service';

/**
 * Issue #233 — depois de toda gravação que deu certo numa pelada, avisa na
 * hora quem está com ela aberta. Erro (4xx/5xx) não avisa.
 */
@Injectable()
export class LiveEventsInterceptor implements NestInterceptor {
  constructor(private readonly live: LiveEventsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context
      .switchToHttp()
      .getRequest<{ method: string; originalUrl?: string; url: string }>();
    const target = liveEventFromRequest(req.method, req.originalUrl ?? req.url);
    if (!target) {
      return next.handle();
    }
    return next.handle().pipe(
      tap({
        complete: () => this.live.emit(target.peladaId, target.scope, target.matchId),
      }),
    );
  }
}
