import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { PeladaOrganizadorContextService } from '../../core/pelada/pelada-organizador-context.service';
import { PeladaContextService } from '../../core/pelada/pelada-context.service';
import type { PeladaRulesApiDto } from '../../core/pelada/pelada-rules-api.mapper';
import { peladaRulesFromApi } from '../../core/pelada/pelada-rules-api.mapper';
import { PeladaRulesApiService } from '../../core/pelada/pelada-rules-api.service';
import type { PeladaPlayerProfileDto } from '../../core/roster/pelada-player-profile-api.model';
import { PeladaPlayerProfileService } from '../../core/roster/pelada-player-profile.service';
import { PeladaRosterService } from '../../core/roster/pelada-roster.service';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import { environment } from '../../../environments/environment';
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
  photoUrl: null,
  paymentPlan: 'PER_MATCH',
  attributes: { tecnica: 7, forca: 6, chute: 8, passe: 5, defesa: 4, velocidade: 9 },
};

function rulesDto(
  allowPlayerSelfEdit: boolean,
  drawWeights: Record<string, unknown> = { mode: 'BALANCED' },
): PeladaRulesApiDto {
  return {
    peladaId: pelada.id,
    playersPerTeam: 6,
    teamCount: 2,
    modality: 'futsal',
    goalkeeperMode: 'ROTATING',
    fixedListOnly: false,
    allowPlayerSelfEdit,
    drawWeights,
    extra: { paymentModel: 'per_match' },
  };
}

function rulesApiMock(
  allowPlayerSelfEdit: boolean,
  drawWeights?: Record<string, unknown>,
) {
  const dto = rulesDto(allowPlayerSelfEdit, drawWeights);
  return {
    fetchRules: () => of(dto),
    mapFromApi: (d: PeladaRulesApiDto) => peladaRulesFromApi(d),
  };
}

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

const routeProvider = {
  provide: ActivatedRoute,
  useValue: {
    snapshot: {
      paramMap: { get: (key: string) => (key === 'playerId' ? 'pl1' : null) },
    },
  },
};

const peladaContextProvider = {
  provide: PeladaContextService,
  useValue: { getActivePelada: () => pelada },
};

const profileServiceProvider = {
  provide: PeladaPlayerProfileService,
  useValue: {
    loadProfile: (
      _p: typeof pelada,
      id: string,
      cb: (dto: PeladaPlayerProfileDto | null) => void,
    ) => cb(id === 'pl1' ? profile : null),
  },
};

function rosterServiceMock(players: RosterPlayer[] = []) {
  return {
    loadRoster: (
      _p: typeof pelada,
      cb: (players: RosterPlayer[], outcome: 'api') => void,
    ) => cb(players, 'api'),
  };
}

const rosterServiceProvider = {
  provide: PeladaRosterService,
  useValue: rosterServiceMock(),
};

describe('JogadorPerfilComponent (3.8)', () => {
  let fixture: ComponentFixture<JogadorPerfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        profileServiceProvider,
        {
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(false, { useRating: false, useAttributes: true }),
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

  it('renderiza §3.8 com tags, atributos e plano, sem nota (modo atributos)', async () => {
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
    expect(text).not.toContain('· Nota');
  });

  it('formulário de edição mostra atributos e não a nota (modo atributos)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('#profile-rating'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('#attr-tecnica'),
    ).not.toBeNull();
  });
});

describe('JogadorPerfilComponent modo nota (issue #186)', () => {
  let fixture: ComponentFixture<JogadorPerfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        profileServiceProvider,
        {
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(false, { useRating: true, useAttributes: false }),
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

  it('mostra a nota e não os atributos na visualização (modo nota)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('· Nota 6');
    expect(text).not.toContain('Técnica');
  });

  it('formulário de edição mostra a nota e não os atributos (modo nota)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('#profile-rating'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('#attr-tecnica'),
    ).toBeNull();
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
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        profileServiceProvider,
        {
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(false),
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
    await Promise.resolve();
    hiddenFixture.detectChanges();
    expect(hiddenFixture.nativeElement.textContent).not.toContain(
      'Editar perfil (adm)',
    );
    expect(hiddenFixture.nativeElement.textContent).not.toContain('Remover da pelada');
  });
});

describe('JogadorPerfilComponent remover da pelada (issue #223)', () => {
  let removeSpy: jasmine.Spy;

  beforeEach(async () => {
    removeSpy = jasmine.createSpy('removePlayer').and.returnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
          { path: 'jogadores', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        {
          provide: PeladaPlayerProfileService,
          useValue: { ...profileServiceProvider.useValue, removePlayer: removeSpy },
        },
        { provide: PeladaRulesApiService, useValue: rulesApiMock(false) },
        { provide: PeladaOrganizadorContextService, useValue: orgContextMock(true) },
        { provide: AuthService, useValue: authMock('user-org') },
      ],
    }).compileComponents();
  });

  async function render() {
    const f = TestBed.createComponent(JogadorPerfilComponent);
    f.detectChanges();
    await f.whenStable();
    await Promise.resolve();
    f.detectChanges();
    return f;
  }
  const btn = (f: ComponentFixture<JogadorPerfilComponent>, label: string) =>
    (Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (b) => b.textContent?.trim() === label,
    );

  it('organizador vê "Remover da pelada" e precisa confirmar (avisa que apaga o histórico)', async () => {
    const f = await render();
    btn(f, 'Remover da pelada')!.click();
    f.detectChanges();
    const text = f.nativeElement.textContent as string;
    expect(removeSpy).not.toHaveBeenCalled();
    expect(text).toContain('Remover Carlos Lima da pelada?');
    expect(text).toContain('todo o histórico');
  });

  it('confirmar remove o jogador e volta pro elenco', async () => {
    const f = await render();
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    btn(f, 'Remover da pelada')!.click();
    f.detectChanges();
    btn(f, 'Remover')!.click();
    f.detectChanges();
    expect(removeSpy).toHaveBeenCalledWith('p1', 'pl1');
    expect(nav).toHaveBeenCalledWith(['/jogadores']);
  });

  it('cancelar não remove', async () => {
    const f = await render();
    btn(f, 'Remover da pelada')!.click();
    f.detectChanges();
    btn(f, 'Cancelar')!.click();
    f.detectChanges();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).not.toContain('da pelada?');
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
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
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
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(true),
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
      'Editar meu perfil',
    );
  });

  it('não pré-preenche atributo em autoedição — só organizador (issue #188)', async () => {
    const selfFixture = TestBed.createComponent(JogadorPerfilComponent);
    selfFixture.detectChanges();
    await selfFixture.whenStable();
    await Promise.resolve();
    selfFixture.detectChanges();

    selfFixture.componentInstance.startEdit();
    const before = selfFixture.componentInstance.editForm().attributes.chute;
    selfFixture.componentInstance.patchTagsText({
      target: { value: 'artilheiro' },
    } as unknown as Event);

    expect(selfFixture.componentInstance.editForm().attributes.chute).toBe(
      before,
    );
    expect(selfFixture.componentInstance.editForm().tagsText).toBe(
      'artilheiro',
    );
  });
});

describe('JogadorPerfilComponent regras via HTTP (3.8)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<JogadorPerfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent, HttpClientTestingModule],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        {
          provide: PeladaPlayerProfileService,
          useValue: {
            loadProfile: (
              _p: typeof pelada,
              id: string,
              cb: (dto: PeladaPlayerProfileDto | null) => void,
            ) =>
              cb(
                id === 'pl1' ? { ...profile, userId: 'user-self' } : null,
              ),
          },
        },
        PeladaRulesApiService,
        {
          provide: PeladaOrganizadorContextService,
          useValue: orgContextMock(false),
        },
        { provide: AuthService, useValue: authMock('user-self') },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(JogadorPerfilComponent);
  });

  afterEach(() => {
    http.verify();
  });

  it('usa allowPlayerSelfEdit da API GET /rules', async () => {
    fixture.detectChanges();

    const rulesReq = http.expectOne(
      `${environment.apiUrl}/peladas/${pelada.id}/rules`,
    );
    rulesReq.flush(rulesDto(true));

    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Editar meu perfil');
  });
});

describe('JogadorPerfilComponent modo edição (3.8-EDIT)', () => {
  it('abre formulário e salva via PATCH', async () => {
    const updateSpy = jasmine.createSpy('updateProfile').and.returnValue(
      of({
        ...profile,
        rating: 8,
        tags: ['novo'],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        profileServiceProvider,
        {
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(false),
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: orgContextMock(true),
        },
        { provide: AuthService, useValue: authMock('user-org') },
        {
          provide: PeladaPlayerProfileService,
          useValue: {
            loadProfile: (
              _p: typeof pelada,
              id: string,
              cb: (dto: PeladaPlayerProfileDto | null) => void,
            ) => cb(id === 'pl1' ? profile : null),
            updateProfile: updateSpy,
          },
        },
      ],
    }).compileComponents();

    const editFixture = TestBed.createComponent(JogadorPerfilComponent);
    editFixture.detectChanges();
    await editFixture.whenStable();
    await Promise.resolve();
    editFixture.detectChanges();

    const btn: HTMLButtonElement | null =
      editFixture.nativeElement.querySelector('button[peladaButton]');
    expect(btn?.textContent).toContain('Editar perfil (adm)');
    btn?.click();
    editFixture.detectChanges();

    expect(editFixture.nativeElement.textContent).toContain('Salvar perfil');

    editFixture.componentInstance.patchTagsText({
      target: { value: 'novo' },
    } as unknown as Event);
    editFixture.componentInstance.onSave(new Event('submit'));
    await editFixture.whenStable();
    editFixture.detectChanges();

    expect(updateSpy).toHaveBeenCalled();
    expect(editFixture.componentInstance.editing()).toBe(false);
    expect(editFixture.nativeElement.textContent).toContain('novo');
  });

  it('pré-preenche atributo ao digitar tag do catálogo (issue #188)', async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        profileServiceProvider,
        {
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(false),
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: orgContextMock(true),
        },
        { provide: AuthService, useValue: authMock('user-org') },
      ],
    }).compileComponents();

    const editFixture = TestBed.createComponent(JogadorPerfilComponent);
    editFixture.detectChanges();
    await editFixture.whenStable();
    await Promise.resolve();
    editFixture.detectChanges();

    editFixture.componentInstance.startEdit();
    editFixture.componentInstance.patchTagsText({
      target: { value: 'artilheiro' },
    } as unknown as Event);

    expect(editFixture.componentInstance.editForm().attributes.chute).toBe(9);
  });

  it('lista sugestões de tags (catálogo) no datalist', async () => {
    await TestBed.configureTestingModule({
      imports: [JogadorPerfilComponent],
      providers: [
        provideRouter([
          { path: 'jogadores/:playerId', component: JogadorPerfilComponent },
        ]),
        routeProvider,
        peladaContextProvider,
        rosterServiceProvider,
        profileServiceProvider,
        {
          provide: PeladaRulesApiService,
          useValue: rulesApiMock(false),
        },
        {
          provide: PeladaOrganizadorContextService,
          useValue: orgContextMock(true),
        },
        { provide: AuthService, useValue: authMock('user-org') },
      ],
    }).compileComponents();

    const editFixture = TestBed.createComponent(JogadorPerfilComponent);
    editFixture.detectChanges();
    await editFixture.whenStable();
    await Promise.resolve();
    editFixture.detectChanges();

    editFixture.componentInstance.startEdit();
    editFixture.detectChanges();

    const options = editFixture.nativeElement.querySelectorAll(
      '#profile-tag-suggestions option',
    );
    expect(options.length).toBeGreaterThan(0);
  });
});
