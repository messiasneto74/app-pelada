import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { phoneRequiredGuard } from './phone-required.guard';

describe('phoneRequiredGuard', () => {
  let auth: { getMe: jasmine.Spy };
  let router: { createUrlTree: jasmine.Spy };

  const runGuard = () =>
    TestBed.runInInjectionContext(() => phoneRequiredGuard({} as never, {} as never));

  beforeEach(() => {
    auth = { getMe: jasmine.createSpy('getMe') };
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
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
});
