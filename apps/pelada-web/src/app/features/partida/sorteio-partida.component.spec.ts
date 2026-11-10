import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { MatchDrawService } from '../../core/match/match-draw.service';
import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import { PeladaMatchAttendanceService } from '../../core/match/pelada-match-attendance.service';
import { SorteioPartidaComponent } from './sorteio-partida.component';
import { of } from 'rxjs';

const roster: RosterPlayer[] = [
  {
    id: 'a1',
    displayName: 'Ana',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 8,
    tags: [],
    isFixedList: false,
  },
  {
    id: 'b1',
    displayName: 'Bruno',
    isGoalkeeper: false,
    position: 'Ataque',
    rating: 6,
    tags: [],
    isFixedList: false,
  },
];

const dash: InicioDashboardView = {
  peladaName: 'Pelada Teste',
  nextMatch: {
    matchId: 'm1',
    dateLabel: 'qua., 05 nov.',
    timeLabel: '19:30',
    locationLabel: 'Society',
    modalityLabel: 'Society',
    confirmedCount: 2,
    capacity: 14,
    vacancyPercent: 14,
    confirmedPlayers: [
      { id: 'a1', displayName: 'Ana' },
      { id: 'b1', displayName: 'Bruno' },
    ],
    presenceLink: '/partida/presenca',
  },
  rosterPlayerCount: 2,
  cashReceivedLabel: 'R$ 0,00',
  cashExpectedLabel: 'R$ 0,00',
  cashPercent: 0,
};

const sampleDraw: MatchDrawDetailDto = {
  drawId: 'd1',
  matchId: 'm1',
  balanceScore: 80,
  seed: '7',
  metrics: {
    balanceScore: 80,
    teamAverages: [7, 7],
    maxAverageDiff: 0,
    summaryText: 'Times ok.',
  },
  teams: [
    {
      id: 't0',
      name: 'Time A',
      sortOrder: 0,
      playerIds: ['a1'],
      players: [{ playerId: 'a1', sortOrder: 0 }],
    },
    {
      id: 't1',
      name: 'Time B',
      sortOrder: 1,
      playerIds: ['b1'],
      players: [{ playerId: 'b1', sortOrder: 0 }],
    },
  ],
};

describe('SorteioPartidaComponent §3.5', () => {
  let fixture: ComponentFixture<SorteioPartidaComponent>;
  let matchDrawSpy: jasmine.SpyObj<MatchDrawService>;

  beforeEach(async () => {
    matchDrawSpy = jasmine.createSpyObj('MatchDrawService', [
      'getDraw',
      'postDraw',
      'patchSwap',
    ]);
    // Monorepo pode duplicar `rxjs` (root vs app); cast evita conflito de tipos no spy.
    matchDrawSpy.getDraw.and.returnValue(
      of(sampleDraw) as unknown as ReturnType<MatchDrawService['getDraw']>,
    );
    matchDrawSpy.postDraw.and.returnValue(
      of(sampleDraw) as unknown as ReturnType<MatchDrawService['postDraw']>,
    );
    matchDrawSpy.patchSwap.and.returnValue(
      of(sampleDraw) as unknown as ReturnType<MatchDrawService['patchSwap']>,
    );

    await TestBed.configureTestingModule({
      imports: [SorteioPartidaComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OAuthService, useValue: { getIdentityClaims: () => ({ sub: 'test-sorteio' }) } },
        {
          provide: PeladaDashboardService,
          useValue: {
            loadDashboard: (_p: unknown, cb: (v: InicioDashboardView) => void) => cb(dash),
          },
        },
        {
          provide: PeladaRosterService,
          useValue: {
            loadRoster: (
              _p: unknown,
              cb: (list: RosterPlayer[], _o: 'api' | 'fallback') => void,
            ) => cb(roster, 'api'),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: {
            isOrganizador: () => true,
            refreshMembership: jasmine.createSpy('refreshMembership'),
          },
        },
        { provide: MatchDrawService, useValue: matchDrawSpy },
        {
          provide: PeladaMatchAttendanceService,
          useValue: {
            closeList: () => of({}),
            reopenList: () => of({}),
          },
        },
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

    const session = TestBed.inject(PresenceSessionService);
    session.save({
      matchId: 'm1',
      listClosed: true,
      statusByPlayerId: {},
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });

    fixture = TestBed.createComponent(SorteioPartidaComponent);
    fixture.detectChanges();
  });

  it('mostra métricas e times após GET /draw', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('80%');
    expect(text).toContain('Time A');
    expect(text).toContain('Time B');
    expect(matchDrawSpy.getDraw).toHaveBeenCalledWith('pel-1', 'm1');
  });

  it('abre modal de compartilhar com texto sem notas (§3.5-SHARE)', () => {
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    const shareBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes('Compartilhar'),
    );
    expect(shareBtn).toBeTruthy();
    (shareBtn as HTMLButtonElement).click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    const textarea = fixture.nativeElement.querySelector('#share-preview-text') as
      | HTMLTextAreaElement
      | null;
    expect(textarea?.value).toContain('Ana');
    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(textarea?.value).not.toContain('nota');
  });
});
