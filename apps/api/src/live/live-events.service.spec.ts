import { firstValueFrom, take, toArray } from 'rxjs';
import { LiveEventsService, liveEventFromRequest } from './live-events.service';

describe('Issue #233 — liveEventFromRequest', () => {
  it('leitura (GET) não avisa ninguém', () => {
    expect(liveEventFromRequest('GET', '/peladas/p1/matches/m1/attendance')).toBeNull();
  });

  it('rota fora de pelada não avisa', () => {
    expect(liveEventFromRequest('POST', '/me/phone')).toBeNull();
    expect(liveEventFromRequest('POST', '/peladas')).toBeNull();
  });

  it.each([
    ['PATCH', '/peladas/p1/matches/m1/attendance/j1', 'attendance', 'm1'],
    ['POST', '/peladas/p1/matches/m1/attendance/self', 'attendance', 'm1'],
    ['POST', '/peladas/p1/matches/m1/draw', 'draw', 'm1'],
    ['PATCH', '/peladas/p1/matches/m1/field-session?x=1', 'field-session', 'm1'],
    ['POST', '/peladas/p1/matches/m1/field-session/goals', 'field-session', 'm1'],
    ['PATCH', '/peladas/p1/matches/m1/rules-override', 'matches', 'm1'],
    ['POST', '/peladas/p1/matches', 'matches', null],
    ['PATCH', '/peladas/p1/players/j1', 'players', null],
    ['POST', '/peladas/p1/payments/ledger', 'payments', null],
    ['PATCH', '/peladas/p1/rules', 'rules', null],
    ['DELETE', '/peladas/p1/membership', 'pelada', null],
  ])('%s %s → %s', (method, path, scope, matchId) => {
    expect(liveEventFromRequest(method, path)).toEqual({ peladaId: 'p1', scope, matchId });
  });

  it('cada pelada só recebe os próprios avisos', async () => {
    const live = new LiveEventsService();
    const got = firstValueFrom(live.forPelada('p1').pipe(take(2), toArray()));
    live.emit('p2', 'attendance', 'mx');
    live.emit('p1', 'attendance', 'm1');
    live.emit('p1', 'draw', 'm1');
    const events = await got;
    expect(events.map((e) => [e.peladaId, e.scope])).toEqual([
      ['p1', 'attendance'],
      ['p1', 'draw'],
    ]);
  });
});
