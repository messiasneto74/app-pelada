import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';

/**
 * As rotas `dev/*` são telas de preview de UI sem autenticação, pensadas só
 * para desenvolvimento local. Sem essa guarda ficam acessíveis em produção
 * (bug Médio da auditoria — ver `app.routes.ts`).
 */
export const devRoutesGuard: CanActivateFn = () => {
  if (!environment.production) {
    return true;
  }
  const router = inject(Router);
  return router.createUrlTree(['/inicio']);
};
