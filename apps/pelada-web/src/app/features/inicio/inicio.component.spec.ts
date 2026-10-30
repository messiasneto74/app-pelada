import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import {
  INICIO_SHORTCUTS,
  type InicioDashboardView,
} from '../../core/inicio/inicio-dashboard.model';
import { PeladaDashboardService } from '../../core/inicio/pelada-dashboard.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { InicioComponent } from './inicio.component';

const mockView: InicioDashboardView = {
  peladaName: 'Pelada Teste',
  nextMatch: {
    matchId: 'm1',
    dateLabel: 'qua., 05 nov.',
    timeLabel: '16:30',
    locationLabel: 'Society ABC',
    modalityLabel: 'Society',
    confirmedCount: 12,
    capacity: 14,
    vacancyPercent: 86,
    confirmedPlayers: [{ id: '1', displayName: 'Ana Silva' }],
    presenceLink: '/partida/presenca',
  },
  rosterPlayerCount: 10,
  cashReceivedLabel: 'R$ 800,00',
  cashExpectedLabel: 'R$ 1.200,00',
  cashPercent: 67,
};

describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([
          { path: 'inicio', component: InicioComponent },
          { path: 'onboarding/pelada', component: InicioComponent },
        ]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-inicio' }) },
        },
        {
          provide: PeladaDashboardService,
          useValue: {
            loadDashboard: (
              _pelada: unknown,
              onResult: (view: InicioDashboardView) => void,
            ) => onResult(mockView),
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'p1',
      name: 'Pelada Teste',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.dashboard()).withContext('dashboard').toBeTruthy();
  });

  it('mostra card da próxima partida e barra de vagas', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Próxima partida');
    expect(text).toContain('12/14 confirmados');
    expect(text).toContain('Abrir lista de presença');
  });

  it('renderiza atalhos §3.1', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Regras');
    expect(text).toContain('Elenco');
    expect(text).toContain('Cobrar');
  });

  it('atalhos usam routerLink das rotas corretas (§3.1)', () => {
    const links = fixture.nativeElement.querySelectorAll(
      '.shortcut-grid a.shortcut',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(INICIO_SHORTCUTS.length);
    const hrefs = [...links].map((a) => a.getAttribute('href'));
    for (const shortcut of INICIO_SHORTCUTS) {
      expect(hrefs).withContext(shortcut.label).toContain(shortcut.route);
    }
    expect(
      fixture.nativeElement.querySelector('a[href="/partida/presenca"]'),
    ).withContext('Abrir lista de presença').not.toBeNull();
  });

  it('mostra resumo do caixa em %', () => {
    expect(fixture.nativeElement.textContent).toContain('67% do total');
    expect(fixture.nativeElement.textContent).toContain('Caixa do mês');
  });
});

describe('InicioComponent sem partida', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([{ path: 'inicio', component: InicioComponent }]),
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-inicio' }) },
        },
        {
          provide: PeladaDashboardService,
          useValue: {
            loadDashboard: (
              _pelada: unknown,
              onResult: (view: InicioDashboardView) => void,
            ) =>
              onResult({
                ...mockView,
                nextMatch: null,
                cashPercent: 0,
              }),
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(PeladaContextService).setActivePelada({
      id: 'p1',
      name: 'Pelada',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
  });

  it('convida a criar a primeira partida', () => {
    const fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma partida marcada');
  });
});
