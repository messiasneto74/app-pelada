import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Exige telefone no perfil da API antes de telas do app (redireciona para completar). */
export const phoneRequiredGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    const me = await auth.getMe();
    if (!me.phone?.trim()) {
      return router.createUrlTree(['/entrar/completar']);
    }
    return true;
  } catch {
    return router.createUrlTree(['/entrar']);
  }
};
