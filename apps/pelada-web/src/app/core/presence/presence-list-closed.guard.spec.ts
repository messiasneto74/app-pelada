import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { presenceListClosedGuard } from './presence-list-closed.guard';
import { PresenceSessionService } from './presence-session.service';

describe('presenceListClosedGuard (3.4-NAV)', () => {
  let session: PresenceSessionService;
  let router: { createUrlTree: jasmine.Spy };

  const runGuard = () =>
    TestBed.runInInjectionContext(() => presenceListClosedGuard({} as never, {} as never));

  beforeEach(() => {
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };
    TestBed.configureTestingModule({
      providers: [
        PresenceSessionService,
        { provide: Router, useValue: router },
      ],
    });
    session = TestBed.inject(PresenceSessionService);
  });

  it('permite Sorteio quando lista fechada', () => {
    session.setActiveMatchId('m1');
    session.save({
      matchId: 'm1',
      listClosed: true,
      statusByPlayerId: {},
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });
    expect(runGuard()).toBe(true);
  });

  it('redireciona para presença se lista aberta', () => {
    session.setActiveMatchId('m1');
    session.save({
      matchId: 'm1',
      listClosed: false,
      statusByPlayerId: {},
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/partida/presenca']);
  });

  it('redireciona se não houver partida ativa', () => {
    session.setActiveMatchId(null);
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/partida/presenca']);
  });
});
