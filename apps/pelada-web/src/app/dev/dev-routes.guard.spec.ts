import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { environment } from '../../environments/environment';
import { devRoutesGuard } from './dev-routes.guard';

describe('devRoutesGuard (Médio)', () => {
  let router: { createUrlTree: jasmine.Spy };
  const originalProduction = environment.production;

  const runGuard = () =>
    TestBed.runInInjectionContext(() => devRoutesGuard({} as never, {} as never));

  beforeEach(() => {
    router = {
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({} as UrlTree),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }],
    });
  });

  afterEach(() => {
    environment.production = originalProduction;
  });

  it('permite acesso quando não é build de produção', () => {
    environment.production = false;
    expect(runGuard()).toBe(true);
  });

  it('bloqueia e redireciona para /inicio em produção', () => {
    environment.production = true;
    runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/inicio']);
  });
});
