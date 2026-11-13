import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { PeladaContextService } from './pelada-context.service';
import { ACTIVE_PELADA_STORAGE_KEY } from './active-pelada.model';

describe('PeladaContextService', () => {
  let service: PeladaContextService;
  const storageKey = `${ACTIVE_PELADA_STORAGE_KEY}:user-test`;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-test' }) },
        },
      ],
    });
    service = TestBed.inject(PeladaContextService);
  });

  afterEach(() => {
    service.clearActivePelada();
  });

  it('persists metadata in sessionStorage escopado ao usuário', () => {
    service.setActivePelada({
      id: 'p1',
      name: 'Pelada Teste',
      defaultWeekday: 3,
      defaultLocation: 'Campo',
      photoPreviewUrl: null,
    });
    expect(service.hasActivePelada()).toBe(true);
    expect(sessionStorage.getItem(storageKey)).toContain('Pelada Teste');
    expect(sessionStorage.getItem(ACTIVE_PELADA_STORAGE_KEY)).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-test' }) },
        },
      ],
    });
    const reloaded = TestBed.inject(PeladaContextService);
    expect(reloaded.getActivePelada()?.name).toBe('Pelada Teste');
  });

  it('ignora JSON inválido ou incompleto no sessionStorage', () => {
    sessionStorage.setItem(storageKey, '{bad');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OAuthService,
          useValue: { getIdentityClaims: () => ({ sub: 'user-test' }) },
        },
      ],
    });
    expect(TestBed.inject(PeladaContextService).hasActivePelada()).toBe(false);
  });

  it('revoga blob URL ao limpar pelada', () => {
    const revoke = spyOn(URL, 'revokeObjectURL');
    service.setActivePelada({
      id: 'p1',
      name: 'Com foto',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: 'blob:http://localhost/fake',
    });
    service.clearActivePelada();
    expect(revoke).toHaveBeenCalledWith('blob:http://localhost/fake');
  });

  it('refreshFromStorage não apaga pelada ativa só em memória (token após POST /peladas)', () => {
    sessionStorage.clear();
    service.setActivePelada({
      id: 'p-novo',
      name: 'Pelada recém-criada',
      defaultWeekday: 3,
      defaultLocation: 'Campo',
      photoPreviewUrl: null,
    });
    sessionStorage.removeItem(storageKey);

    service.refreshFromStorage();

    expect(service.getActivePelada()?.id).toBe('p-novo');
    expect(sessionStorage.getItem(storageKey)).toContain('Pelada recém-criada');
  });

  it('refreshFromStorage descarta pelada em memória de outro sub (troca de usuário)', () => {
    const oauthMock = {
      getIdentityClaims: jasmine
        .createSpy('getIdentityClaims')
        .and.returnValue({ sub: 'user-a' }),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: OAuthService, useValue: oauthMock }],
    });
    const svcA = TestBed.inject(PeladaContextService);
    svcA.setActivePelada({
      id: 'p-a',
      name: 'Pelada do A',
      defaultWeekday: null,
      defaultLocation: '',
      photoPreviewUrl: null,
    });
    sessionStorage.removeItem(`${ACTIVE_PELADA_STORAGE_KEY}:user-a`);

    oauthMock.getIdentityClaims.and.returnValue({ sub: 'user-b' });
    svcA.refreshFromStorage();

    expect(svcA.hasActivePelada()).toBe(false);
    expect(sessionStorage.getItem(`${ACTIVE_PELADA_STORAGE_KEY}:user-b`)).toBeNull();
  });
});
