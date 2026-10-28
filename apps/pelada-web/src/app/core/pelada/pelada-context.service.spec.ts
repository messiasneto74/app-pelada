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
});
