import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, throwError } from 'rxjs';
import {
  AuthService,
  mapPasswordLoginError,
  mapRegisterError,
} from './auth.service';
import { PeladaApiService } from '../core/pelada/pelada-api.service';
import { PeladaContextService } from '../core/pelada/pelada-context.service';

describe('mapPasswordLoginError', () => {
  it('credenciais inválidas', () => {
    expect(
      mapPasswordLoginError({ status: 401, error: { error: 'invalid_grant' } }),
    ).toContain('incorretos');
  });

  it('client sem Direct Access Grants', () => {
    expect(
      mapPasswordLoginError({
        status: 400,
        error: { error: 'unauthorized_client' },
      }),
    ).toContain('Direct Access Grants');
  });

  it('rede / IdP fora', () => {
    expect(mapPasswordLoginError({ status: 0 })).toContain('Keycloak');
  });
});

describe('mapRegisterError', () => {
  it('conflito de e-mail', () => {
    expect(mapRegisterError({ status: 409 })).toContain('Já existe');
  });

  it('validação', () => {
    expect(
      mapRegisterError({
        status: 400,
        error: { message: 'email must be an email' },
      }),
    ).toContain('email must be an email');
  });
});

describe('AuthService.continueAfterLogin', () => {
  let service: AuthService;
  let oauth: { hasValidAccessToken: jasmine.Spy };
  let http: { get: jasmine.Spy };
  let router: { navigateByUrl: jasmine.Spy };
  let peladaContext: {
    hasActivePelada: jasmine.Spy;
    setActivePelada: jasmine.Spy;
  };
  let peladaApi: { listMyPeladas: jasmine.Spy };

  beforeEach(() => {
    oauth = {
      hasValidAccessToken: jasmine
        .createSpy('hasValidAccessToken')
        .and.returnValue(true),
    };
    http = { get: jasmine.createSpy('get') };
    router = {
      navigateByUrl: jasmine
        .createSpy('navigateByUrl')
        .and.resolveTo(true),
    };
    peladaContext = {
      hasActivePelada: jasmine.createSpy('hasActivePelada').and.returnValue(false),
      setActivePelada: jasmine.createSpy('setActivePelada'),
    };
    peladaApi = {
      listMyPeladas: jasmine.createSpy('listMyPeladas').and.resolveTo([]),
    };

  TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauth },
        { provide: HttpClient, useValue: http },
        { provide: Router, useValue: router },
        {
          provide: PeladaContextService,
          useValue: {
            refreshFromStorage: () => {},
            ...peladaContext,
          },
        },
        { provide: PeladaApiService, useValue: peladaApi },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('vai para /entrar/completar sem telefone', async () => {
    http.get.and.returnValue(
      of({
        id: '1',
        keycloakSub: 'sub',
        email: 'a@b.com',
        phone: null,
      }),
    );
    await service.continueAfterLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar/completar', {
      replaceUrl: true,
    });
  });

  it('vai para /inicio com telefone e pelada na API', async () => {
    http.get.and.returnValue(
      of({
        id: '1',
        keycloakSub: 'sub',
        email: 'a@b.com',
        phone: '11999990000',
      }),
    );
    peladaApi.listMyPeladas.and.resolveTo([
      {
        id: 'p1',
        name: 'Pelada',
        defaultWeekday: 6,
        defaultLocation: 'Campo',
      },
    ]);
    await service.continueAfterLogin();
    expect(peladaContext.setActivePelada).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio', {
      replaceUrl: true,
    });
  });

  it('vai para onboarding/pelada sem pelada ativa', async () => {
    http.get.and.returnValue(
      of({
        id: '1',
        keycloakSub: 'sub',
        email: 'a@b.com',
        phone: '11999990000',
      }),
    );
    peladaApi.listMyPeladas.and.resolveTo([]);
    await service.continueAfterLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/pelada', {
      replaceUrl: true,
    });
  });

  it('vai para /inicio quando /me falha (guard não deve devolver a /entrar)', async () => {
    http.get.and.returnValue(throwError(() => new Error('api')));
    await service.continueAfterLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio', {
      replaceUrl: true,
    });
  });
});
