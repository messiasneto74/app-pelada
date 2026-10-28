import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { peladaOnboardingGuard } from './pelada-onboarding.guard';
import { PeladaContextService } from './pelada-context.service';

describe('peladaOnboardingGuard', () => {
  let pelada: { hasActivePelada: jasmine.Spy };
  let router: { createUrlTree: jasmine.Spy };

  const runGuard = () =>
    TestBed.runInInjectionContext(() => peladaOnboardingGuard({} as never, {} as never));

  beforeEach(() => {
    pelada = { hasActivePelada: jasmine.createSpy('hasActivePelada') };
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PeladaContextService, useValue: pelada },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows when pelada ativa existe', () => {
    pelada.hasActivePelada.and.returnValue(true);
    expect(runGuard()).toBe(true);
  });

  it('redirects to onboarding when sem pelada', () => {
    pelada.hasActivePelada.and.returnValue(false);
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/onboarding/pelada']);
  });
});
