import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
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
            getDraw: () => of({ teams: [] }),
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
});
