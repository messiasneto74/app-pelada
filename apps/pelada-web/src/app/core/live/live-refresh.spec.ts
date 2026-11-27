import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subject } from 'rxjs';
import { PeladaContextService } from '../pelada/pelada-context.service';
import { LiveEventsService, type LiveChange } from './live-events';
import { LIVE_SAFETY_REFRESH_MS, LiveRefreshService } from './live-refresh';

describe('LiveRefreshService (issue #233)', () => {
  let onDestroy: (() => void) | null;
  const destroyRef = { onDestroy: (fn: () => void) => (onDestroy = fn) } as unknown as DestroyRef;

  beforeEach(() => {
    onDestroy = null;
    jasmine.clock().install();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => null, getAccessToken: () => null },
        },
      ],
    });
  });
  afterEach(() => jasmine.clock().uninstall());

  it('chama a atualização a cada intervalo e para ao destruir a tela', () => {
    const refresh = jasmine.createSpy('refresh');
    TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
    jasmine.clock().tick(5001);
    expect(refresh).toHaveBeenCalledTimes(1);
    jasmine.clock().tick(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
    onDestroy!();
    jasmine.clock().tick(20000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('não atualiza com a tela em segundo plano', () => {
    const refresh = jasmine.createSpy('refresh');
    const vis = spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');
    TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
    jasmine.clock().tick(15000);
    expect(refresh).not.toHaveBeenCalled();
    vis.and.returnValue('visible');
    jasmine.clock().tick(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
    onDestroy!();
  });

  describe('com aviso instantâneo (issue #233)', () => {
    let changes: Subject<LiveChange>;
    let connected: boolean;
    beforeEach(() => {
      jasmine.clock().mockDate(new Date(2026, 0, 1));
      changes = new Subject<LiveChange>();
      connected = true;
      TestBed.configureTestingModule({
        providers: [
          {
            provide: LiveEventsService,
            useValue: { changes: () => changes, isConnected: () => connected },
          },
          {
            provide: PeladaContextService,
            useValue: { getActivePelada: () => ({ id: 'p1' }) },
          },
        ],
      });
    });
    const change = (): LiveChange => ({ peladaId: 'p1', scope: 'attendance', matchId: 'm1', at: '' });

    it('aviso da API atualiza na hora (sem esperar o intervalo)', () => {
      const refresh = jasmine.createSpy('refresh');
      TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
      changes.next(change());
      jasmine.clock().tick(200);
      expect(refresh).toHaveBeenCalledTimes(1);
      onDestroy!();
      changes.next(change());
      jasmine.clock().tick(200);
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('vários avisos juntos viram uma busca só', () => {
      const refresh = jasmine.createSpy('refresh');
      TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
      changes.next(change());
      changes.next(change());
      changes.next(change());
      jasmine.clock().tick(200);
      expect(refresh).toHaveBeenCalledTimes(1);
      onDestroy!();
    });

    it('conectado: a busca de garantia é só a cada 30 s; caiu a conexão: volta pra 5 s', () => {
      const refresh = jasmine.createSpy('refresh');
      TestBed.inject(LiveRefreshService).start(destroyRef, refresh, 5000);
      jasmine.clock().tick(25_001);
      expect(refresh).not.toHaveBeenCalled();
      jasmine.clock().tick(LIVE_SAFETY_REFRESH_MS - 25_000);
      expect(refresh).toHaveBeenCalledTimes(1);
      connected = false;
      jasmine.clock().tick(5000);
      expect(refresh).toHaveBeenCalledTimes(2);
      onDestroy!();
    });
  });
});
