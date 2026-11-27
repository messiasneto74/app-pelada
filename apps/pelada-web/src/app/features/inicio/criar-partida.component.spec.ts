import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import { environment } from '../../../environments/environment';
import { CriarPartidaComponent } from './criar-partida.component';

const pelada = {
  id: 'p1',
  name: 'Teste',
  defaultWeekday: null,
  defaultLocation: 'Campo Central',
  photoPreviewUrl: null,
};

describe('CriarPartidaComponent (3.3)', () => {
  let fixture: ComponentFixture<CriarPartidaComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriarPartidaComponent, HttpClientTestingModule],
      providers: [
        provideRouter([
          { path: 'partida/presenca', component: CriarPartidaComponent },
          { path: 'inicio', component: CriarPartidaComponent },
        ]),
        {
          provide: PeladaContextService,
          useValue: { getActivePelada: () => pelada },
        },
        {
          provide: PeladaRulesApiService,
          useValue: {
            fetchRules: () =>
              of({
                peladaId: 'p1',
                playersPerTeam: 6,
                teamCount: 2,
                modality: 'futsal',
                goalkeeperMode: 'ROTATING',
                fixedListOnly: false,
                allowPlayerSelfEdit: false,
                drawWeights: {},
                extra: {},
              }),
            mapFromApi: (d: { modality: string }) => ({
              playersPerTeam: 6,
              teamCount: 2,
              modality: d.modality,
            }),
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CriarPartidaComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('renderiza §3.3 com regras, data e modo presença', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Criar partida');
    expect(text).toContain('Modo de presença');
    expect(text).toContain('Adm marca');
    expect(text).toContain('Jogador marca presença');
    expect(text).toContain('Lista de nomes');
    expect(text).toContain('2 times');
  });

  it('issue #192 — não expõe referência interna de spec/história na tela', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toMatch(/§|história\s+\d|\d+\.\d+-[A-Z]+/);
  });

  it('POST /matches e navega para presença ao enviar', async () => {
    fixture.componentInstance.values.update((v) => ({
      ...v,
      date: '2030-05-20',
      time: '19:30',
      location: 'Quadra',
    }));
    fixture.componentInstance.onSubmit(new Event('submit'));
    fixture.detectChanges();

    const req = http.expectOne(
      `${environment.apiUrl}/peladas/p1/matches`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body.presenceMode).toBe('ORGANIZER_CLOSES');
    req.flush({
      id: 'm1',
      peladaId: 'p1',
      scheduledAt: '2030-05-20T22:30:00.000Z',
      location: 'Quadra',
      notes: null,
      presenceMode: 'ORGANIZER_CLOSES',
      status: 'SCHEDULED',
    });

    await fixture.whenStable();
    const router = TestBed.inject(Router);
    expect(router.url).toContain('/partida/presenca');
  });
});

describe('CriarPartidaComponent — forma de presença (issue #234)', () => {
  function setup(rules$: Subject<unknown>) {
    TestBed.configureTestingModule({
      imports: [CriarPartidaComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: PeladaContextService, useValue: { getActivePelada: () => pelada } },
        { provide: PeladaRulesApiService, useValue: { fetchRules: () => rules$ } },
      ],
    });
    const f = TestBed.createComponent(CriarPartidaComponent);
    f.detectChanges();
    return f;
  }
  const rulesDto = (presenceMode: string) => ({
    peladaId: 'p1',
    playersPerTeam: 6,
    teamCount: 2,
    modality: 'futsal',
    goalkeeperMode: 'ROTATING',
    fixedListOnly: false,
    presenceMode,
    drawWeights: {},
    extra: {},
  });

  it('vem marcada a forma das Regras', () => {
    const rules$ = new Subject<unknown>();
    const f = setup(rules$);
    rules$.next(rulesDto('NAME_LIST'));
    expect(f.componentInstance.values().presenceMode).toBe('NAME_LIST');
  });

  it('Regras chegando atrasadas não trocam a escolha que o adm já fez', () => {
    const rules$ = new Subject<unknown>();
    const f = setup(rules$);
    f.componentInstance.patchPresence('SELF_CONFIRM');
    rules$.next(rulesDto('NAME_LIST'));
    expect(f.componentInstance.values().presenceMode).toBe('SELF_CONFIRM');
  });
});
