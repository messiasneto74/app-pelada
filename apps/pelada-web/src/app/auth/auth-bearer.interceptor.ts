import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/** Anexa JWT Keycloak nas chamadas à API (F0-6). */
export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = environment.apiUrl.replace(/\/$/, '');
  const url = req.url.replace(/\/$/, '');
  if (!url.startsWith(apiBase)) {
    return next(req);
  }

  const oauth = inject(OAuthService);
  const token = oauth.getAccessToken();
  if (!token) {
    return next(req);
  }

  const router = inject(Router);
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  ).pipe(
    catchError((err: unknown) => {
      // Sessão expirou entre o token anexado acima e a resposta da API —
      // desloga e manda pro login em vez de deixar a tela travada num
      // erro genérico (ver issue de sessão expirando durante testes manuais).
      if (err instanceof HttpErrorResponse && err.status === 401 && router.url !== '/entrar') {
        oauth.logOut(true);
        void router.navigateByUrl('/entrar');
      }
      return throwError(() => err);
    }),
  );
};
