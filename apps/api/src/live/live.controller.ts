import { Controller, Header, MessageEvent, Param, Sse, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { interval, map, merge, Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LiveEventsService, toMessageEvent } from './live-events.service';
import { LiveMemberGuard } from './live-member.guard';

/** Issue #233 — a cada 25 s um "ping" mantém a conexão viva atrás de proxy. */
export const LIVE_HEARTBEAT_MS = 25_000;

@Controller()
export class LiveController {
  constructor(private readonly live: LiveEventsService) {}

  /**
   * Issue #233 — avisos instantâneos da pelada (Server-Sent Events). O app
   * abre com o mesmo `Authorization: Bearer` das outras rotas e, a cada
   * aviso `change`, busca de novo a tela aberta.
   */
  @Sse('peladas/:peladaId/live')
  @SkipThrottle()
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @UseGuards(JwtAuthGuard, LiveMemberGuard)
  stream(@Param('peladaId') peladaId: string): Observable<MessageEvent> {
    return merge(
      this.live.forPelada(peladaId).pipe(toMessageEvent),
      interval(LIVE_HEARTBEAT_MS).pipe(map(() => ({ type: 'ping', data: {} }))),
    );
  }
}
