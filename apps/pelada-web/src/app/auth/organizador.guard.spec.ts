import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { organizadorGuard } from './organizador.guard';

describe('organizadorGuard', () => {
  it('redirects to inicio until pelada role API exists', () => {
    const router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }],
    });

    TestBed.runInInjectionContext(() => organizadorGuard({} as never, {} as never));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/inicio']);
  });
});
