import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { MatchDrawService } from '../../core/match/match-draw.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { MatchFieldSessionService } from '../../core/match/match-field-session.service';
import type { MatchFieldSessionDto } from '../../core/match/match-field-session-api.model';
import { CampoPartidaComponent } from './campo-partida.component';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

const dash: InicioDashboardView = {
  peladaName: 'Pelada Teste',
  nextMatch: {
    matchId: 'm1',
    dateLabel: 'qua.',
    timeLabel: '19:30',
    locationLabel: 'Society',
    modalityLabel: 'Society',
    confirmedCount: 2,
    capacity: 14,
    vacancyPercent: 14,
    confirmedPlayers: [],
    presenceLink: '/partida/presenca',
  },
  rosterPlayerCount: 2,
  cashReceivedLabel: 'R$ 0',
  cashExpectedLabel: 'R$ 0',
  cashPercent: 0,
};

const fieldSession: MatchFieldSessionDto = {
  sessionId: 's1',
  matchId: 'm1',
  rotationPolicy: 'WINNER_STAYS',
  roundNumber: 1,
  scoreHome: 1,
  scoreAway: 0,
  elapsedMs: 0,
  timerRunning: false,
  timerRunningSince: null,
  finishedAt: null,
  teamsOnField: [
    { sortOrder: 0, drawTeamId: 't0', name: 'Time A', role: 'HOME' },
    { sortOrder: 1, drawTeamId: 't1', name: 'Time B', role: 'AWAY' },
  ],
  restingTeams: [{ sortOrder: 2, drawTeamId: 't2', name: 'Time C' }],
  fixedGkMeta: {},
};

describe('CampoPartidaComponent §3.6', () => {
  let fixture: ComponentFixture<CampoPartidaComponent>;
  let fieldSpy: jasmine.SpyObj<MatchFieldSessionService>;

  beforeEach(async () => {
    fieldSpy = jasmine.createSpyObj('MatchFieldSessionService', [
      'getSession',
      'startSession',
      'patchSession',
      'endRound',
      'finish',
    ]);
    fieldSpy.getSession.and.returnValue(of(fieldSession));
    fieldSpy.endRound.and.returnValue(of(fieldSession));
    fieldSpy.finish.and.returnValue(
      of({ ...fieldSession, finishedAt: new Date().toISOString() }),
    );

    await TestBed.configureTestingModule({
      imports: [CampoPartidaComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: { getIdentityClaims: () => ({ sub: 'test' }) } },
        {
          provide: PeladaDashboardService,
          useValue: {
            loadDashboard: (_p: unknown, cb: (v: InicioDashboardView) => void) => cb(dash),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: {
            isOrganizador: () => true,
            refreshMembership: jasmine.createSpy('refreshMembership'),
          },
        },
        {
          provide: MatchDrawService,
          useValue: {
            getDraw: () =>
              of({
                teams: [
                  { id: 't0', name: 'Time A', sortOrder: 0, playerIds: ['p2', 'p1'], players: [] },
                  { id: 't1', name: 'Time B', sortOrder: 1, playerIds: ['p3'], players: [] },
                ],
              }),
          },
        },
        {
          provide: PeladaRosterService,
          useValue: {
            loadRoster: (_p: unknown, cb: (v: RosterPlayer[]) => void) =>
              cb([
                { id: 'p1', displayName: 'Zé Linha' },
                { id: 'p2', displayName: 'Ana Gol' },
                { id: 'p3', displayName: 'Bia Visitante' },
              ] as RosterPlayer[]),
            loadGuests: (_p: unknown, cb: (v: RosterPlayer[]) => void) => cb([]),
          },
        },
        { provide: MatchFieldSessionService, useValue: fieldSpy },
        PresenceSessionService,
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'pel-1',
      name: 'Pelada Teste',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
    TestBed.inject(PresenceSessionService).save({
      matchId: 'm1',
      listClosed: true,
      statusByPlayerId: {},
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });

    fixture = TestBed.createComponent(CampoPartidaComponent);
    fixture.detectChanges();
  });

  it('mostra placar e time descansando', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Time A');
    expect(text).toContain('Time B');
    expect(text).toContain('Time C');
    expect(text).toContain('Ganha fica');
    expect(fieldSpy.getSession).toHaveBeenCalledWith('pel-1', 'm1');
  });

  it('reatualiza sessão ao voltar do background (visibility)', fakeAsync(() => {
    fieldSpy.getSession.calls.reset();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    tick();
    expect(fieldSpy.getSession).toHaveBeenCalledWith('pel-1', 'm1');
  }));

  it('oferece iniciar quando GET sessão 404', fakeAsync(() => {
    fieldSpy.getSession.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const f2 = TestBed.createComponent(CampoPartidaComponent);
    f2.detectChanges();
    tick();
    f2.detectChanges();
    const text = f2.nativeElement.textContent as string;
    expect(text).toContain('Iniciar jogo em campo');
    f2.destroy();
  }));

  it('cronômetro da rodada: mostra o limite e avisa quando o tempo acaba (issue #229)', fakeAsync(() => {
    fieldSpy.getSession.and.returnValue(
      of({ ...fieldSession, roundElapsedMs: 60_000, roundLimitMs: 60_000, timeUp: true }),
    );
    const f2 = TestBed.createComponent(CampoPartidaComponent);
    f2.detectChanges();
    tick();
    f2.detectChanges();
    const text = f2.nativeElement.textContent as string;
    expect(text).toContain('01:00');
    expect(text).toContain('de 01:00');
    expect(text).toContain('Tempo esgotado');
    const start = (Array.from(f2.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (b) => b.textContent?.trim() === 'Iniciar cronômetro',
    );
    expect(start?.disabled).toBeTrue();
    f2.destroy();
  }));

  it('tempo acaba com o cronômetro ainda rodando: botão vira "Iniciar" travado (issue #229)', fakeAsync(() => {
    fieldSpy.getSession.and.returnValue(
      of({ ...fieldSession, timerRunning: true, timerRunningSince: new Date().toISOString(), roundElapsedMs: 59_000, roundLimitMs: 60_000, timeUp: false }),
    );
    const f2 = TestBed.createComponent(CampoPartidaComponent);
    f2.detectChanges();
    tick(3000);
    f2.detectChanges();
    const btns = Array.from(f2.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(btns.some((b) => b.textContent?.trim() === 'Pausar cronômetro')).toBeFalse();
    const start = btns.find((b) => b.textContent?.trim() === 'Iniciar cronômetro');
    expect(start?.disabled).toBeTrue();
    expect(f2.nativeElement.textContent).toContain('Tempo esgotado');
    f2.destroy();
    discardPeriodicTasks();
  }));

    it('cronômetro mostra o tempo da rodada, não o acumulado do dia (issue #229)', fakeAsync(() => {
    fieldSpy.getSession.and.returnValue(
      of({ ...fieldSession, elapsedMs: 900_000, roundElapsedMs: 15_000, roundLimitMs: 600_000, timeUp: false }),
    );
    const f2 = TestBed.createComponent(CampoPartidaComponent);
    f2.detectChanges();
    tick();
    f2.detectChanges();
    const text = f2.nativeElement.textContent as string;
    expect(text).toContain('00:15');
    expect(text).toContain('de 10:00');
    expect(text).not.toContain('Tempo esgotado');
    f2.destroy();
  }));

    it('partida encerrada mostra link "Ver resumo do dia" com matchId na query', fakeAsync(() => {
    fieldSpy.getSession.and.returnValue(
      of({ ...fieldSession, finishedAt: new Date().toISOString() }),
    );
    const f2 = TestBed.createComponent(CampoPartidaComponent);
    f2.detectChanges();
    tick();
    f2.detectChanges();
    const text = f2.nativeElement.textContent as string;
    expect(text).toContain('Ver resumo do dia');
    const link = (
      Array.from(f2.nativeElement.querySelectorAll('a[href^="/partida/resumo"]')) as HTMLAnchorElement[]
    ).find((a) => a.textContent?.includes('Ver resumo do dia')) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('matchId=m1');
    f2.destroy();
  }));

  it('pede confirmação antes de encerrar o jogo e rodízio (issue #191)', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const endRoundBtn = buttons.find(
      (b) => b.textContent?.trim() === 'Encerrar jogo e rodízio',
    );
    endRoundBtn?.click();
    fixture.detectChanges();

    expect(fieldSpy.endRound).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Encerrar jogo e rodízio?',
    );

    const confirmBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.trim() === 'Confirmar') as
      | HTMLButtonElement
      | undefined;
    confirmBtn?.click();
    fixture.detectChanges();

    expect(fieldSpy.endRound).toHaveBeenCalledWith('pel-1', 'm1');
  });

  it('cancelar a confirmação não chama a API (issue #191)', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const finishBtn = buttons.find(
      (b) => b.textContent?.trim() === 'Encerrar partida',
    );
    finishBtn?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Encerrar partida?');

    const cancelBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.trim() === 'Cancelar') as
      | HTMLButtonElement
      | undefined;
    cancelBtn?.click();
    fixture.detectChanges();

    expect(fieldSpy.finish).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Encerrar partida?');
  });

  it('confirmar encerra a partida de fato (issue #191)', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const finishBtn = buttons.find(
      (b) => b.textContent?.trim() === 'Encerrar partida',
    );
    finishBtn?.click();
    fixture.detectChanges();

    const confirmBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => (b as HTMLButtonElement).textContent?.trim() === 'Confirmar') as
      | HTMLButtonElement
      | undefined;
    confirmBtn?.click();
    fixture.detectChanges();

    expect(fieldSpy.finish).toHaveBeenCalledWith('pel-1', 'm1');
  });

  describe('autor do gol (issue #214)', () => {
    const btn = (label: string) =>
      (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
        (b) => b.textContent?.trim() === label,
      );

    beforeEach(() => {
      fieldSpy.patchSession.and.returnValue(of(fieldSession));
    });

    it('"+1" pergunta quem fez, listando só o time que marcou', () => {
      btn('+1 Time A')?.click();
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(fieldSpy.patchSession).not.toHaveBeenCalled();
      expect(text).toContain('Quem fez o gol do Time A?');
      expect(btn('Ana Gol')).toBeDefined();
      expect(btn('Zé Linha')).toBeDefined();
      expect(btn('Bia Visitante')).toBeUndefined();
    });

    it('escolher o jogador marca o gol com autor', () => {
      btn('+1 Time B')?.click();
      fixture.detectChanges();
      btn('Bia Visitante')?.click();
      fixture.detectChanges();
      expect(fieldSpy.patchSession).toHaveBeenCalledWith('pel-1', 'm1', {
        addGoal: 'AWAY',
        goalPlayerId: 'p3',
      });
      expect(fixture.nativeElement.textContent).not.toContain('Quem fez o gol');
    });

    it('"Gol contra / sem autor" marca o gol sem autor', () => {
      btn('+1 Time A')?.click();
      fixture.detectChanges();
      btn('Gol contra / sem autor')?.click();
      fixture.detectChanges();
      expect(fieldSpy.patchSession).toHaveBeenCalledWith('pel-1', 'm1', { addGoal: 'HOME' });
    });

    it('cancelar não marca gol', () => {
      btn('+1 Time A')?.click();
      fixture.detectChanges();
      btn('Cancelar')?.click();
      fixture.detectChanges();
      expect(fieldSpy.patchSession).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).not.toContain('Quem fez o gol');
    });

    it('"Desfazer último gol" continua funcionando direto, sem abrir a pergunta', () => {
      btn('+1 Time A')?.click();
      fixture.detectChanges();
      btn('Ana Gol')?.click();
      fixture.detectChanges();
      fieldSpy.patchSession.calls.reset();
      fieldSpy.patchSession.and.returnValue(of({ ...fieldSession, scoreHome: 0 }));

      btn('Desfazer último gol')?.click();
      fixture.detectChanges();

      expect(fieldSpy.patchSession).toHaveBeenCalledOnceWith('pel-1', 'm1', { undoGoal: true });
      expect(fixture.nativeElement.textContent).not.toContain('Quem fez o gol');
    });
  });
});
