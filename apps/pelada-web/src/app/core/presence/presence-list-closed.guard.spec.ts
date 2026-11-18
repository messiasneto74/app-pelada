import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router, UrlTree } from '@angular/router';
import { isObservable, lastValueFrom, of, throwError, type Observable } from 'rxjs';
import { PeladaMatchAttendanceService } from '../match/pelada-match-attendance.service';
import { PeladaContextService } from '../pelada/pelada-context.service';
import { presenceListClosedGuard } from './presence-list-closed.guard';
import { PresenceSessionService } from './presence-session.service';

describe('presenceListClosedGuard (3.4-NAV)', () => {
  let session: PresenceSessionService;
  let router: { createUrlTree: jasmine.Spy };
  let activePelada: { id: string } | null;
  let dashboard: () => Observable<unknown>;
  let attendance: () => Observable<unknown>;

  const runGuard = () =>
    TestBed.runInInjectionContext(() => presenceListClosedGuard({} as never, {} as never));

  beforeEach(() => {
    activePelada = null;
    dashboard = () => throwError(() => new Error('não deveria chamar'));
    attendance = () => throwError(() => new Error('não deveria chamar'));
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };
    TestBed.configureTestingModule({
      providers: [
        PresenceSessionService,
        { provide: Router, useValue: router },
        {
          provide: PeladaContextService,
          useValue: { getActivePelada: () => activePelada },
        },
        { provide: HttpClient, useValue: { get: () => dashboard() } },
        {
          provide: PeladaMatchAttendanceService,
          useValue: { getList: () => attendance() },
        },
      ],
    });
    session = TestBed.inject(PresenceSessionService);
    sessionStorage.clear();
  });

  it('permite Sorteio após reload (snapshot fechado, sem activeMatchId em memória)', () => {
    session.save({
      matchId: 'm1',
      listClosed: true,
      statusByPlayerId: {},
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });
    session.setActiveMatchId(null);
    expect(runGuard()).toBe(true);
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

  it('redireciona se partida ativa sem snapshot (não usa outra fechada no storage)', () => {
    session.save({
      matchId: 'm-old',
      listClosed: true,
      statusByPlayerId: {},
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });
    session.setActiveMatchId('m-new');
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/partida/presenca']);
    expect(session.getActiveMatchId()).toBe('m-new');
  });

  it('redireciona se não houver partida ativa', () => {
    sessionStorage.clear();
    session.setActiveMatchId(null);
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/partida/presenca']);
  });

  it('sem sessão (app reaberto), libera Sorteio/Em campo se a API diz lista fechada', async () => {
    sessionStorage.clear();
    session.setActiveMatchId(null);
    activePelada = { id: 'p1' };
    dashboard = () => of({ nextMatch: { id: 'm9' } });
    attendance = () => of({ matchId: 'm9', listClosed: true });

    const result = runGuard();
    expect(isObservable(result)).toBe(true);
    expect(await lastValueFrom(result as Observable<unknown>)).toBe(true);
    expect(session.resolveMatchIdWithClosedList()).toBe('m9');
  });

  it('sem sessão, redireciona se a API diz lista aberta', async () => {
    sessionStorage.clear();
    session.setActiveMatchId(null);
    activePelada = { id: 'p1' };
    dashboard = () => of({ nextMatch: { id: 'm9' } });
    attendance = () => of({ matchId: 'm9', listClosed: false });

    const result = await lastValueFrom(runGuard() as Observable<unknown>);
    expect(result).not.toBe(true);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/partida/presenca']);
  });

  it('API fora do ar → redireciona pra presença', async () => {
    sessionStorage.clear();
    session.setActiveMatchId(null);
    activePelada = { id: 'p1' };
    dashboard = () => throwError(() => new Error('offline'));

    const result = await lastValueFrom(runGuard() as Observable<unknown>);
    expect(result).not.toBe(true);
  });
});
