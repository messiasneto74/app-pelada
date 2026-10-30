import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import { PeladaRulesService } from '../../core/pelada/pelada-rules.service';
import type { PeladaPlayerProfileDto } from '../../core/roster/pelada-player-profile-api.model';
import { PeladaPlayerProfileService } from '../../core/roster/pelada-player-profile.service';
import { JogadorPerfilComponent } from './jogador-perfil.component';

const pelada = {
  id: 'p1',
  name: 'Teste',
  defaultWeekday: null,
  defaultLocation: '',
  photoPreviewUrl: null,
};

const profile: PeladaPlayerProfileDto = {
  id: 'pl1',
  displayName: 'Carlos Lima',
  isGoalkeeper: false,
  position: 'Ataque',
  rating: 6,
  tags: ['corredor'],
  isFixedList: false,
  userId: null,
  paymentPlan: 'PER_MATCH',
  attributes: { tecnica: 7, forca: 6, chute: 8, passe: 5, defesa: 4, velocidade: 9 },
};

describe('JogadorPerfilComponent (3.8)', () => {
  let fixture: ComponentFixture<JogadorPerfilComponent>;

  function providers(isOrganizador: boolean) {
    return [
      provideRouter([
        { path: 'jogadores', component: JogadorPerfilComponent },
        { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
      ]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: { get: (key: string) => (key === 'playerId' ? 'pl1' : null) },
          },
        },
      },
      {
        provide: PeladaContextService,
        useValue: {
          getActivePelada: () => pelada,
        },
      },
      {
        provide: PeladaRulesService,
        useValue: {
          getDefaultRules: () => ({
            fixedListOnly: false,
            allowPlayerSelfEdit: false,
          }),
        },
      },
      {
        provide: PeladaPlayerProfileService,
        useValue: {
          loadProfile: (
            _p: typeof pelada,
            id: string,
            cb: (dto: PeladaPlayerProfileDto | null) => void,
          ) => cb(id === 'pl1' ? profile : null),
        },
      },
      {
        provide: PeladaOrganizadorContextService,
        useValue: { isOrganizador: () => isOrganizador },
      },
    ];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: providers(true),
    }).compileComponents();

    fixture = TestBed.createComponent(JogadorPerfilComponent);
  });

  it('renderiza §3.8 com tags, atributos e plano', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Carlos Lima');
    expect(text).toContain('corredor');
    expect(text).toContain('Técnica');
    expect(text).toContain('Por partida');
    expect(text).toContain('Editar perfil (adm)');
  });
});

describe('JogadorPerfilComponent editar oculto (3.8)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([{ path: 'jogadores/:playerId', component: JogadorPerfilComponent }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'playerId' ? 'pl1' : null) },
            },
          },
        },
        { provide: PeladaContextService, useValue: { getActivePelada: () => pelada } },
        {
          provide: PeladaRulesService,
          useValue: {
            getDefaultRules: () => ({
              fixedListOnly: false,
              allowPlayerSelfEdit: false,
            }),
          },
        },
        {
          provide: PeladaPlayerProfileService,
          useValue: {
            loadProfile: (
              _p: typeof pelada,
              id: string,
              cb: (dto: PeladaPlayerProfileDto | null) => void,
            ) => cb(id === 'pl1' ? profile : null),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: { isOrganizador: () => false },
        },
      ],
    }).compileComponents();
  });

  it('oculta editar quando não é organizador e regra 27 desligada', () => {
    const hiddenFixture = TestBed.createComponent(JogadorPerfilComponent);
    hiddenFixture.detectChanges();
    expect(hiddenFixture.nativeElement.textContent).not.toContain(
      'Editar perfil (adm)',
    );
  });
});
