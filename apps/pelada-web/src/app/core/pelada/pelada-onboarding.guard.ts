import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PeladaApiService } from './pelada-api.service';
import { PeladaContextService } from './pelada-context.service';

/**
 * Redireciona para onboarding quando ainda não há pelada ativa (L1).
 *
 * C1: a pelada ativa fica só no sessionStorage, então abrir em outro
 * aparelho ou numa sessão nova (sem cache) mandava direto para onboarding
 * mesmo quando o usuário já tem pelada. Antes de redirecionar, tenta
 * restaurar via `GET /me/peladas`.
 */
export const peladaOnboardingGuard: CanActivateFn = async () => {
  const pelada = inject(PeladaContextService);
  const router = inject(Router);

  if (pelada.hasActivePelada()) {
    return true;
  }

  const api = inject(PeladaApiService);
  try {
    const peladas = await api.listMyPeladas();
    const first = peladas[0];
    if (first) {
      pelada.setActivePelada({
        id: first.id,
        name: first.name,
        defaultWeekday: first.defaultWeekday,
        defaultLocation: first.defaultLocation ?? '',
        photoPreviewUrl: null,
      });
      return true;
    }
  } catch {
    /* API indisponível (offline/erro) — segue para onboarding normalmente. */
  }

  return router.createUrlTree(['/onboarding/pelada']);
};
