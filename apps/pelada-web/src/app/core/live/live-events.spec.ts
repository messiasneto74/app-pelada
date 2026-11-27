import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';
import { LiveEventsService, liveReconnectDelayMs, parseSseChunk, type LiveChange } from './live-events';

describe('LiveEventsService (issue #233)', () => {
  it('parseSseChunk separa eventos completos e guarda o pedaço que falta', () => {
    const r = parseSseChunk(
      'event: change\ndata: {"a":1}\n\nevent: ping\ndata: {}\n\nevent: change\ndata: {"a"',
    );
    expect(r.events).toEqual([
      { type: 'change', data: '{"a":1}' },
      { type: 'ping', data: '{}' },
    ]);
    expect(r.rest).toBe('event: change\ndata: {"a"');
    expect(parseSseChunk('event: change\r\ndata: {"b":2}\r\n\r\n').events).toEqual([
      { type: 'change', data: '{"b":2}' },
    ]);
  });

  it('reconexão espera cada vez mais, até 30 s', () => {
    expect(liveReconnectDelayMs(0)).toBe(2000);
    expect(liveReconnectDelayMs(1)).toBe(4000);
    expect(liveReconnectDelayMs(10)).toBe(30_000);
  });

  function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
    const enc = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(enc.encode(c));
        // fica aberto (como o servidor), até a tela fechar
      },
    });
  }

  it('abre o fluxo com Bearer, entrega só os avisos "change" e fecha ao sair da tela', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: OAuthService, useValue: { getAccessToken: () => 'tok-1' } }],
    });
    const svc = TestBed.inject(LiveEventsService);
    const ev: LiveChange = { peladaId: 'p1', scope: 'attendance', matchId: 'm1', at: 'x' };
    let signal: AbortSignal | undefined;
    const fetchSpy = jasmine.createSpy('fetch').and.callFake((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return Promise.resolve(
        new Response(
          streamOf([`event: ping\ndata: {}\n\nevent: change\ndata: ${JSON.stringify(ev)}\n\n`]),
          { status: 200 },
        ),
      );
    });
    svc.fetchFn = fetchSpy;

    const got: LiveChange[] = [];
    const sub = svc.changes('p1').subscribe((c) => got.push(c));
    await new Promise((r) => setTimeout(r, 50));

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe(`${environment.apiUrl}/peladas/p1/live`);
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-1');
    expect(got).toEqual([ev]);
    expect(svc.isConnected('p1')).toBeTrue();

    sub.unsubscribe();
    expect(signal?.aborted).toBeTrue();
    expect(svc.isConnected('p1')).toBeFalse();
  });

  it('sem login não conecta', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: OAuthService, useValue: { getAccessToken: () => null } }],
    });
    const svc = TestBed.inject(LiveEventsService);
    const fetchSpy = jasmine.createSpy('fetch');
    svc.fetchFn = fetchSpy;
    const sub = svc.changes('p1').subscribe();
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchSpy).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('duas telas abertas na mesma pelada usam uma conexão só', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: OAuthService, useValue: { getAccessToken: () => 'tok' } }],
    });
    const svc = TestBed.inject(LiveEventsService);
    const fetchSpy = jasmine
      .createSpy('fetch')
      .and.callFake(() => Promise.resolve(new Response(streamOf([]), { status: 200 })));
    svc.fetchFn = fetchSpy;
    const a = svc.changes('p1').subscribe();
    const b = svc.changes('p1').subscribe();
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    a.unsubscribe();
    b.unsubscribe();
  });
});
