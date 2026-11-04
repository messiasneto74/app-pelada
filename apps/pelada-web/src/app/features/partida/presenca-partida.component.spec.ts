import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { OAuthService } from 'angular-oauth2-oidc';
import type { InicioDashboardView } from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PresenceSessionService } from '../../core/presence/presence-session.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { PresencaPartidaComponent } from './presenca-partida.component';

const players: RosterPlayer[] = [
  {
    id: 'a1',
    displayName: 'Ana Silva',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 8,
    tags: [],
    isFixedList: true,
    userId: 'user-self',
  },
  {
    id: 'b1',
    displayName: 'Bruno',
    isGoalkeeper: false,
    position: 'Ataque',
    rating: 7,
    tags: [],
    isFixedList: false,
    userId: null,
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
    confirmedCount: 1,
    capacity: 14,
    vacancyPercent: 7,
    confirmedPlayers: [{ id: 'a1', displayName: 'Ana Silva' }],
    presenceLink: '/partida/presenca',
  },
  rosterPlayerCount: 2,
  cashReceivedLabel: 'R$ 0,00',
  cashExpectedLabel: 'R$ 0,00',
  cashPercent: 0,
};

describe('PresencaPartidaComponent §3.4', () => {
  let fixture: ComponentFixture<PresencaPartidaComponent>;
  let refreshMembership: jasmine.Spy;

  beforeEach(async () => {
    refreshMembership = jasmine.createSpy('refreshMembership');
    await TestBed.configureTestingModule({
      imports: [PresencaPartidaComponent],
      providers: [
        provideRouter([{ path: 'partida/presenca', component: PresencaPartidaComponent }]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'test-presenca' }) },
        },
        {
          provide: AuthService,
          useValue: {
            getMe: () =>
              Promise.resolve({
                id: 'user-self',
                keycloakSub: 'sub',
                email: null,
                phone: null,
              }),
          },
        },
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
              cb: (list: RosterPlayer[], outcome: 'api' | 'fallback') => void,
            ) => cb(players, 'api'),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: {
            isOrganizador: () => true,
            refreshMembership,
          },
        },
        PresenceSessionService,
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'p1',
      name: 'Pelada Teste',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
    TestBed.inject(PresenceSessionService).clear('m1');

    fixture = TestBed.createComponent(PresencaPartidaComponent);
    fixture.detectChanges();
  });

  it('carrega membership do organizador no init', () => {
    expect(refreshMembership).toHaveBeenCalledWith('p1');
  });

  it('mostra resumo de vagas e segmentos', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('de 14 vagas');
    expect(text).toContain('Confirmados');
    expect(text).toContain('Fechar lista e sortear');
  });

  it('lista jogador confirmado com chip', () => {
    expect(fixture.nativeElement.textContent).toContain('Ana Silva');
    expect(fixture.nativeElement.textContent).toContain('Confirmou');
  });

  it('modo SELF_CONFIRM mostra Vou/Não vou para o jogador logado', async () => {
    TestBed.inject(PresenceSessionService).save({
      matchId: 'm1',
      listClosed: false,
      statusByPlayerId: { a1: 'pending', b1: 'pending' },
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'SELF_CONFIRM',
    });
    fixture = TestBed.createComponent(PresencaPartidaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.segment.set('pending');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Vou');
    expect(text).toContain('Não vou');
  });

  it('exibe convidado com aceitar/recusar quando na sessão', () => {
    TestBed.inject(PresenceSessionService).save({
      matchId: 'm1',
      listClosed: false,
      statusByPlayerId: { a1: 'confirmed', b1: 'pending' },
      guests: [
        {
          kind: 'guest',
          guestId: 'g1',
          displayName: 'Visitante',
          status: 'guest_pending',
        },
      ],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });
    fixture = TestBed.createComponent(PresencaPartidaComponent);
    fixture.detectChanges();
    fixture.componentInstance.segment.set('pending');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Visitante');
    expect(text).toContain('Aceitar');
    expect(text).toContain('Recusar');
  });

  it('restaura convidado aceito após remount da sessão', () => {
    const session = TestBed.inject(PresenceSessionService);
    session.save({
      matchId: 'm1',
      listClosed: false,
      statusByPlayerId: {
        a1: 'confirmed',
        b1: 'pending',
        'guest-g1': 'confirmed',
      },
      guests: [],
      extraPlayers: [
        {
          id: 'guest-g1',
          displayName: 'Visitante Aceito',
          isGoalkeeper: false,
          position: 'Convidado',
          rating: 5,
          tags: [],
          isFixedList: false,
        },
      ],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });
    fixture = TestBed.createComponent(PresencaPartidaComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Visitante Aceito');
    expect(fixture.nativeElement.textContent).toContain('Confirmou');
  });

  it('não apaga sessão quando elenco falha (fallback)', async () => {
    const session = TestBed.inject(PresenceSessionService);

    await TestBed.resetTestingModule();
    const refreshMembership2 = jasmine.createSpy('refreshMembership');
    await TestBed.configureTestingModule({
      imports: [PresencaPartidaComponent],
      providers: [
        provideRouter([{ path: 'partida/presenca', component: PresencaPartidaComponent }]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'test-presenca' }) },
        },
        {
          provide: AuthService,
          useValue: { getMe: () => Promise.resolve({ id: 'x', keycloakSub: 's', email: null, phone: null }) },
        },
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
              cb: (list: RosterPlayer[], outcome: 'api' | 'fallback') => void,
            ) => cb([], 'fallback'),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: { isOrganizador: () => true, refreshMembership: refreshMembership2 },
        },
        PresenceSessionService,
      ],
    }).compileComponents();
    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'p1',
      name: 'Pelada Teste',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
    session.save({
      matchId: 'm1',
      listClosed: false,
      statusByPlayerId: { a1: 'confirmed' },
      guests: [],
      extraPlayers: [],
      queueOrder: [],
      presenceMode: 'ORGANIZER_CLOSES',
    });

    const fixture2 = TestBed.createComponent(PresencaPartidaComponent);
    fixture2.detectChanges();
    const snap = session.load('m1');
    expect(snap?.statusByPlayerId['a1']).toBe('confirmed');
  });
});
