import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

/** Anexa JWT Keycloak nas chamadas à API (F0-6). */
export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = environment.apiUrl.replace(/\/$/, '');
  const url = req.url.replace(/\/$/, '');
  if (!url.startsWith(apiBase)) {
    return next(req);
  }

  const token = inject(OAuthService).getAccessToken();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
