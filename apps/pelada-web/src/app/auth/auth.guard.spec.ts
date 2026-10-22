import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let oauth: { hasValidAccessToken: jasmine.Spy };
  let router: { createUrlTree: jasmine.Spy };

  const runGuard = () =>
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

  beforeEach(() => {
    oauth = { hasValidAccessToken: jasmine.createSpy('hasValidAccessToken') };
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: OAuthService, useValue: oauth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows when access token is valid', () => {
    oauth.hasValidAccessToken.and.returnValue(true);
    expect(runGuard()).toBe(true);
  });

  it('redirects to entrar when not authenticated', () => {
    oauth.hasValidAccessToken.and.returnValue(false);
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/entrar']);
  });
});
