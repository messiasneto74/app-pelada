import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
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

function orgContextMock(isOrganizador: boolean) {
  return {
    isOrganizador: (peladaId: string) => isOrganizador && peladaId === 'p1',
    refreshMembership: () => {},
  };
}

function authMock(userId: string) {
  return {
    getMe: () =>
      Promise.resolve({
        id: userId,
        keycloakSub: 'sub',
        email: null,
        phone: null,
      }),
  };
}

describe('JogadorPerfilComponent (3.8)', () => {
  let fixture: ComponentFixture<JogadorPerfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'playerId' ? 'pl1' : null),
              },
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
          useValue: orgContextMock(true),
        },
        { provide: AuthService, useValue: authMock('user-org') },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JogadorPerfilComponent);
  });

  it('renderiza §3.8 com tags, atributos e plano', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
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
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'playerId' ? 'pl1' : null),
              },
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
          useValue: orgContextMock(false),
        },
        { provide: AuthService, useValue: authMock('user-jog') },
      ],
    }).compileComponents();
  });

  it('oculta editar quando não é organizador e regra 27 desligada', async () => {
    const hiddenFixture = TestBed.createComponent(JogadorPerfilComponent);
    hiddenFixture.detectChanges();
    await hiddenFixture.whenStable();
    expect(hiddenFixture.nativeElement.textContent).not.toContain(
      'Editar perfil (adm)',
    );
  });
});

describe('JogadorPerfilComponent regra 27 (3.8)', () => {
  const linkedProfile: PeladaPlayerProfileDto = {
    ...profile,
    userId: 'user-self',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'playerId' ? 'pl1' : null),
              },
            },
          },
        },
        { provide: PeladaContextService, useValue: { getActivePelada: () => pelada } },
        {
          provide: PeladaRulesService,
          useValue: {
            getDefaultRules: () => ({
              fixedListOnly: false,
              allowPlayerSelfEdit: true,
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
            ) => cb(id === 'pl1' ? linkedProfile : null),
          },
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: orgContextMock(false),
        },
        { provide: AuthService, useValue: authMock('user-self') },
      ],
    }).compileComponents();
  });

  it('mostra editar para jogador com regra 27 e userId vinculado', async () => {
    const selfFixture = TestBed.createComponent(JogadorPerfilComponent);
    selfFixture.detectChanges();
    await selfFixture.whenStable();
    await Promise.resolve();
    selfFixture.detectChanges();
    expect(selfFixture.nativeElement.textContent).toContain(
      'Editar perfil (adm)',
    );
  });
});
