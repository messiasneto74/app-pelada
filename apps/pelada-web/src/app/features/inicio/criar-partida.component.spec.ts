import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
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
    expect(text).toContain('Org. fecha lista');
    expect(text).toContain('2 times');
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
