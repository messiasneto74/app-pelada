import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';

/** Exige telefone no perfil da API antes de telas do app (redireciona para completar). */
export const phoneRequiredGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const oauth = inject(OAuthService);

  try {
    const me = await auth.getMe();
    if (!me.phone?.trim()) {
      return router.createUrlTree(['/entrar/completar']);
    }
    return true;
  } catch {
    // `/me` indisponível mas JWT válido: não mandar de volta a `/entrar` (loop no Continuar).
    if (oauth.hasValidAccessToken()) {
      return true;
    }
    return router.createUrlTree(['/entrar']);
  }
};
