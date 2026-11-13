import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { peladaOnboardingGuard } from './pelada-onboarding.guard';
import { PeladaApiService } from './pelada-api.service';
import { PeladaContextService } from './pelada-context.service';

describe('peladaOnboardingGuard', () => {
  let pelada: { hasActivePelada: jasmine.Spy; setActivePelada: jasmine.Spy };
  let router: { createUrlTree: jasmine.Spy };
  let peladaApi: { listMyPeladas: jasmine.Spy };

  const runGuard = () =>
    TestBed.runInInjectionContext(() => peladaOnboardingGuard({} as never, {} as never));

  beforeEach(() => {
    pelada = {
      hasActivePelada: jasmine.createSpy('hasActivePelada'),
      setActivePelada: jasmine.createSpy('setActivePelada'),
    };
    router = {
      createUrlTree: jasmine
        .createSpy('createUrlTree')
        .and.returnValue({} as UrlTree),
    };
    peladaApi = {
      listMyPeladas: jasmine.createSpy('listMyPeladas').and.resolveTo([]),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PeladaContextService, useValue: pelada },
        { provide: Router, useValue: router },
        { provide: PeladaApiService, useValue: peladaApi },
      ],
    });
  });

  it('allows when pelada ativa existe (cache local)', async () => {
    pelada.hasActivePelada.and.returnValue(true);
    expect(await runGuard()).toBe(true);
    expect(peladaApi.listMyPeladas).not.toHaveBeenCalled();
  });

  it('C1: restaura pelada via API quando não há cache (outro aparelho)', async () => {
    pelada.hasActivePelada.and.returnValue(false);
    peladaApi.listMyPeladas.and.resolveTo([
      {
        id: 'p1',
        name: 'Pelada da Praça',
        photoUrl: null,
        defaultWeekday: 3,
        defaultLocation: 'Campo Zé',
        role: 'ORGANIZADOR',
      },
    ]);

    expect(await runGuard()).toBe(true);
    expect(pelada.setActivePelada).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Pelada da Praça',
      defaultWeekday: 3,
      defaultLocation: 'Campo Zé',
      photoPreviewUrl: null,
    });
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to onboarding when API não retorna pelada', async () => {
    pelada.hasActivePelada.and.returnValue(false);
    peladaApi.listMyPeladas.and.resolveTo([]);

    await runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/onboarding/pelada']);
  });

  it('redirects to onboarding when API falha', async () => {
    pelada.hasActivePelada.and.returnValue(false);
    peladaApi.listMyPeladas.and.rejectWith(new Error('offline'));

    await runGuard();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/onboarding/pelada']);
  });
});
