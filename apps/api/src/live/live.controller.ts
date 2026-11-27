import { Controller, Header, MessageEvent, Param, Req, Sse, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { concatMap, from, interval, map, merge, Observable, takeWhile } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LiveEventsService, type LiveEvent } from './live-events.service';
import { LiveMemberGuard } from './live-member.guard';

/** Issue #233 — a cada 25 s um "ping" mantém a conexão viva atrás de proxy. */
export const LIVE_HEARTBEAT_MS = 25_000;

type Tick = { kind: 'change'; event: LiveEvent } | { kind: 'ping' };

@Controller()
export class LiveController {
  constructor(
    private readonly live: LiveEventsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Issue #233 — avisos instantâneos da pelada (Server-Sent Events). O app
   * abre com o mesmo `Authorization: Bearer` das outras rotas e, a cada
   * aviso `change`, busca de novo a tela aberta.
   *
   * A cada aviso (e a cada ping) confere se a conta ainda é da pelada: quem
   * saiu ou foi removido para de receber na hora e o fluxo é encerrado.
   */
  @Sse('peladas/:peladaId/live')
  @SkipThrottle()
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @UseGuards(JwtAuthGuard, LiveMemberGuard)
  stream(
    @Param('peladaId') peladaId: string,
    @Req() req: { liveUserId?: string },
  ): Observable<MessageEvent> {
    const userId = req.liveUserId ?? '';
    const ticks: Observable<Tick> = merge(
      this.live.forPelada(peladaId).pipe(map((event): Tick => ({ kind: 'change', event }))),
      interval(LIVE_HEARTBEAT_MS).pipe(map((): Tick => ({ kind: 'ping' }))),
    );
    return ticks.pipe(
      concatMap((tick) =>
        from(this.isMember(peladaId, userId)).pipe(map((member) => ({ tick, member }))),
      ),
      takeWhile(({ member }) => member),
      map(({ tick }) =>
        tick.kind === 'change'
          ? { type: 'change', data: tick.event }
          : { type: 'ping', data: {} },
      ),
    );
  }

  private async isMember(peladaId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
      select: { userId: true },
    });
    return m !== null;
  }
}
