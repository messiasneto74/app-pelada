import { Injectable } from '@nestjs/common';
import { filter, map, Observable, Subject } from 'rxjs';

/** Issue #233 — o que mudou numa pelada (o app busca de novo só o que precisa). */
export type LiveScope =
  | 'attendance'
  | 'draw'
  | 'field-session'
  | 'matches'
  | 'players'
  | 'payments'
  | 'rules'
  | 'pelada';

export type LiveEvent = {
  peladaId: string;
  scope: LiveScope;
  matchId: string | null;
  at: string;
};

/**
 * Issue #233 — avisos instantâneos: toda gravação que deu certo numa pelada
 * vira um evento aqui e vai na hora pra quem está com o app aberto nela
 * (`GET /peladas/:id/live`, Server-Sent Events).
 *
 * Em memória: vale pra uma instância da API (o deploy atual). Com mais de
 * uma instância, trocar o Subject por um pub/sub (ex.: Postgres LISTEN/NOTIFY).
 */
@Injectable()
export class LiveEventsService {
  private readonly events = new Subject<LiveEvent>();

  emit(peladaId: string, scope: LiveScope, matchId: string | null = null): void {
    this.events.next({ peladaId, scope, matchId, at: new Date().toISOString() });
  }

  forPelada(peladaId: string): Observable<LiveEvent> {
    return this.events.pipe(filter((e) => e.peladaId === peladaId));
  }
}

/**
 * Issue #233 — de uma rota que grava (`POST/PATCH/PUT/DELETE /peladas/:id/...`)
 * tira a pelada, a partida (se houver) e o assunto do aviso.
 */
export function liveEventFromRequest(
  method: string,
  path: string,
): { peladaId: string; scope: LiveScope; matchId: string | null } | null {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
    return null;
  }
  const clean = path.split('?')[0]!.replace(/\/+$/, '');
  const m = /^\/peladas\/([^/]+)(\/.*)?$/.exec(clean);
  if (!m) {
    return null;
  }
  const peladaId = decodeURIComponent(m[1]!);
  const rest = m[2] ?? '';
  const match = /^\/matches\/([^/]+)(\/.*)?$/.exec(rest);
  if (match) {
    const matchId = decodeURIComponent(match[1]!);
    const sub = match[2] ?? '';
    let scope: LiveScope = 'matches';
    if (sub.startsWith('/attendance')) scope = 'attendance';
    else if (sub.startsWith('/draw')) scope = 'draw';
    else if (sub.startsWith('/field-session')) scope = 'field-session';
    return { peladaId, scope, matchId };
  }
  if (rest.startsWith('/matches')) return { peladaId, scope: 'matches', matchId: null };
  if (rest.startsWith('/players') || rest.startsWith('/guests')) {
    return { peladaId, scope: 'players', matchId: null };
  }
  if (rest.startsWith('/payments')) return { peladaId, scope: 'payments', matchId: null };
  if (rest.startsWith('/rules')) return { peladaId, scope: 'rules', matchId: null };
  return { peladaId, scope: 'pelada', matchId: null };
}

/** Mapeia o evento pro formato do `@Sse()` do Nest. */
export const toMessageEvent = map((e: LiveEvent) => ({ type: 'change', data: e }));
