import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';
import { phoneRequiredGuard } from './phone-required.guard';

describe('phoneRequiredGuard', () => {
  let auth: { getMe: jasmine.Spy };
  let router: { createUrlTree: jasmine.Spy };
  let oauth: { hasValidAccessToken: jasmine.Spy };

  const runGuard = () =>
    TestBed.runInInjectionContext(() => phoneRequiredGuard({} as never, {} as never));

  beforeEach(() => {
    auth = { getMe: jasmine.createSpy('getMe') };
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };
    oauth = {
      hasValidAccessToken: jasmine
        .createSpy('hasValidAccessToken')
        .and.returnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: OAuthService, useValue: oauth },
      ],
    });
  });

  it('allows when phone is set', async () => {
    auth.getMe.and.resolveTo({
      id: '1',
      keycloakSub: 'sub',
      email: 'a@b.com',
      phone: '11999990000',
    });
    await expectAsync(runGuard()).toBeResolvedTo(true);
  });

  it('redirects to completar when phone missing', async () => {
    auth.getMe.and.resolveTo({
      id: '1',
      keycloakSub: 'sub',
      email: 'a@b.com',
      phone: null,
    });
    await runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/entrar/completar']);
  });

  it('allows app quando /me falha mas o token ainda é válido (evita loop em /entrar)', async () => {
    auth.getMe.and.rejectWith(new Error('api down'));
    oauth.hasValidAccessToken.and.returnValue(true);
    await expectAsync(runGuard()).toBeResolvedTo(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('manda para /entrar quando /me falha e não há sessão', async () => {
    auth.getMe.and.rejectWith(new Error('api down'));
    oauth.hasValidAccessToken.and.returnValue(false);
    await runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/entrar']);
  });
});
