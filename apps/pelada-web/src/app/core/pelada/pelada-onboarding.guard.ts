import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PeladaContextService } from './pelada-context.service';

/** Redireciona para onboarding quando ainda não há pelada ativa (L1). */
export const peladaOnboardingGuard: CanActivateFn = () => {
  const pelada = inject(PeladaContextService);
  const router = inject(Router);

  if (pelada.hasActivePelada()) {
    return true;
  }
  return router.createUrlTree(['/onboarding/pelada']);
};
