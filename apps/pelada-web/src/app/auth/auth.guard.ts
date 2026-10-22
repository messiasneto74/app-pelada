import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

export const authGuard: CanActivateFn = () => {
  const oauth = inject(OAuthService);
  const router = inject(Router);
  if (oauth.hasValidAccessToken()) {
    return true;
  }
  return router.createUrlTree(['/entrar']);
};
