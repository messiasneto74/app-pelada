import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, throwError } from 'rxjs';
import {
  AuthService,
  mapPasswordLoginError,
  mapRegisterError,
} from './auth.service';
import { nativeBridge } from './native-bridge';
import { PeladaApiService } from '../core/pelada/pelada-api.service';
import { PeladaContextService } from '../core/pelada/pelada-context.service';
import { PendingInviteService } from '../core/pelada/pending-invite.service';

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

describe('AuthService.loginWithPassword', () => {
  let service: AuthService;
  let oauth: {
    fetchTokenUsingPasswordFlowAndLoadUserProfile: jasmine.Spy;
    loadDiscoveryDocument: jasmine.Spy;
    tokenEndpoint: string;
    getIdentityClaims: jasmine.Spy;
    configure: jasmine.Spy;
    initLoginFlow: jasmine.Spy;
    oidc: boolean;
  };
  let peladaContext: { refreshFromStorage: jasmine.Spy };

  beforeEach(() => {
    oauth = {
      fetchTokenUsingPasswordFlowAndLoadUserProfile: jasmine
        .createSpy('fetchTokenUsingPasswordFlowAndLoadUserProfile')
        .and.resolveTo({}),
      loadDiscoveryDocument: jasmine
        .createSpy('loadDiscoveryDocument')
        .and.resolveTo({}),
      tokenEndpoint: 'http://keycloak/token',
      getIdentityClaims: jasmine
        .createSpy('getIdentityClaims')
        .and.returnValue({ sub: 'keycloak-sub-login' }),
      configure: jasmine.createSpy('configure'),
      initLoginFlow: jasmine.createSpy('initLoginFlow'),
      oidc: true,
    };
    peladaContext = {
      refreshFromStorage: jasmine.createSpy('refreshFromStorage'),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauth },
        {
          provide: HttpClient,
          useValue: {
            get: jasmine.createSpy('get'),
            post: jasmine.createSpy('post'),
          },
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
          },
        },
        { provide: PeladaContextService, useValue: peladaContext },
        {
          provide: PeladaApiService,
          useValue: { listMyPeladas: jasmine.createSpy('listMyPeladas') },
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('carrega user profile no password grant (sub disponível)', async () => {
    await service.loginWithPassword(' dev@pelada.local ', 'pass-ok');
    expect(oauth.fetchTokenUsingPasswordFlowAndLoadUserProfile).toHaveBeenCalledWith(
      'dev@pelada.local',
      'pass-ok',
    );
    expect(oauth.getIdentityClaims()).toEqual(
      jasmine.objectContaining({ sub: 'keycloak-sub-login' }),
    );
    expect(peladaContext.refreshFromStorage).toHaveBeenCalled();
  });

  it('desliga oidc só durante o grant password, restaurando depois (issue #193)', async () => {
    let oidcDuringCall: boolean | undefined;
    oauth.fetchTokenUsingPasswordFlowAndLoadUserProfile.and.callFake(() => {
      oidcDuringCall = oauth.oidc;
      return Promise.resolve({});
    });

    await service.loginWithPassword('dev@pelada.local', 'pass-ok');

    expect(oidcDuringCall).toBe(false);
    expect(oauth.oidc).toBe(true);
  });

  it('restaura oidc mesmo quando o grant password falha', async () => {
    oauth.fetchTokenUsingPasswordFlowAndLoadUserProfile.and.rejectWith(
      new Error('invalid_grant'),
    );

    await expectAsync(
      service.loginWithPassword('dev@pelada.local', 'senha-errada'),
    ).toBeRejected();

    expect(oauth.oidc).toBe(true);
  });

  it('loginWithGoogle inicia o code flow com kc_idp_hint=google', async () => {
    await service.loginWithGoogle();
    expect(oauth.initLoginFlow).toHaveBeenCalledWith('', { kc_idp_hint: 'google' });
  });
});

describe('AuthService — deep link nativo (Capacitor)', () => {
  let service: AuthService;
  let oauth: {
    tryLoginCodeFlow: jasmine.Spy;
    loadDiscoveryDocumentAndTryLogin: jasmine.Spy;
    hasValidAccessToken: jasmine.Spy;
    getIdentityClaims: jasmine.Spy;
    configure: jasmine.Spy;
    events: { subscribe: jasmine.Spy };
  };
  let peladaContext: { refreshFromStorage: jasmine.Spy };
  let appUrlOpenCallback: ((event: { url: string }) => void) | undefined;
  const originalIsNativePlatform = Capacitor.isNativePlatform;

  beforeEach(() => {
    appUrlOpenCallback = undefined;
    Capacitor.isNativePlatform = () => true;
    spyOn(nativeBridge, 'onAppUrlOpen').and.callFake((cb) => {
      appUrlOpenCallback = cb;
    });
    spyOn(nativeBridge, 'closeSystemBrowser').and.resolveTo();

    oauth = {
      tryLoginCodeFlow: jasmine.createSpy('tryLoginCodeFlow').and.resolveTo(),
      loadDiscoveryDocumentAndTryLogin: jasmine
        .createSpy('loadDiscoveryDocumentAndTryLogin')
        .and.resolveTo(),
      hasValidAccessToken: jasmine.createSpy('hasValidAccessToken').and.returnValue(true),
      getIdentityClaims: jasmine.createSpy('getIdentityClaims').and.returnValue({}),
      configure: jasmine.createSpy('configure'),
      events: { subscribe: jasmine.createSpy('subscribe') },
    };
    peladaContext = {
      refreshFromStorage: jasmine.createSpy('refreshFromStorage'),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauth },
        { provide: HttpClient, useValue: { get: jasmine.createSpy('get') } },
        { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) } },
        { provide: PeladaContextService, useValue: peladaContext },
        { provide: PeladaApiService, useValue: { listMyPeladas: jasmine.createSpy('listMyPeladas') } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    Capacitor.isNativePlatform = originalIsNativePlatform;
  });

  it('captura o retorno do navegador do sistema e completa o code flow', async () => {
    await service.init();
    expect(nativeBridge.onAppUrlOpen).toHaveBeenCalledWith(jasmine.any(Function));

    appUrlOpenCallback?.({
      url: 'com.pelada.app://callback?code=abc123&state=xyz',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(nativeBridge.closeSystemBrowser).toHaveBeenCalled();
    expect(oauth.tryLoginCodeFlow).toHaveBeenCalledWith({
      customHashFragment: '?code=abc123&state=xyz',
    });
    expect(peladaContext.refreshFromStorage).toHaveBeenCalled();
  });

  it('ignora URLs que não são o callback OIDC', async () => {
    await service.init();
    appUrlOpenCallback?.({ url: 'com.pelada.app://outra-coisa' });
    await Promise.resolve();
    expect(oauth.tryLoginCodeFlow).not.toHaveBeenCalled();
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

  describe('convite pendente (issue #172)', () => {
    let pendingInvite: PendingInviteService;

    beforeEach(() => {
      pendingInvite = TestBed.inject(PendingInviteService);
      http.get.and.returnValue(
        of({ id: '1', keycloakSub: 'sub', email: 'a@b.com', phone: '11999990000' }),
      );
    });

    it('resgata o convite pendente após login e entra direto na pelada', async () => {
      pendingInvite.set('tok-1');
      (peladaApi as unknown as { redeemInvite: jasmine.Spy }).redeemInvite =
        jasmine.createSpy('redeemInvite').and.resolveTo({
          peladaId: 'pel-convite',
          name: 'Pelada Convidada',
          photoUrl: null,
          defaultWeekday: 3,
          defaultLocation: 'Quadra Y',
        });

      await service.continueAfterLogin();

      expect(
        (peladaApi as unknown as { redeemInvite: jasmine.Spy }).redeemInvite,
      ).toHaveBeenCalledWith('tok-1');
      expect(peladaContext.setActivePelada).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'pel-convite', name: 'Pelada Convidada' }),
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio', {
        replaceUrl: true,
      });
      expect(pendingInvite.consume()).toBeNull();
    });

    it('convite inválido durante o login volta pra tela do convite', async () => {
      pendingInvite.set('tok-x');
      (peladaApi as unknown as { redeemInvite: jasmine.Spy }).redeemInvite =
        jasmine.createSpy('redeemInvite').and.rejectWith({ status: 410 });

      await service.continueAfterLogin();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/convite/tok-x', {
        replaceUrl: true,
      });
      expect(peladaContext.setActivePelada).not.toHaveBeenCalled();
    });
  });
});
