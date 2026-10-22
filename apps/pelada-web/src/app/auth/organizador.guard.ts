import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Rotas de organizador (regras, sorteio, caixa) — papel vem da API por pelada (issues 3.x).
 * F0-6: stub nega acesso até existir contexto de pelada + endpoint de papel.
 */
export const organizadorGuard: CanActivateFn = () => {
  const router = inject(Router);
  return router.createUrlTree(['/inicio']);
};
