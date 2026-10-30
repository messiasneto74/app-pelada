import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';
import { PeladaContextService } from '../core/pelada/pelada-context.service';
import { buildAuthConfig } from './auth.config';

export type MeProfile = {
  id: string;
  keycloakSub: string;
  email: string | null;
  phone: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauth = inject(OAuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly peladaContext = inject(PeladaContextService);

  private configured = false;

  async init(): Promise<void> {
    if (!this.configured) {
      this.oauth.configure(buildAuthConfig());
      this.configured = true;
    }
    try {
      const login = this.oauth.loadDiscoveryDocumentAndTryLogin();
      if (environment.production) {
        await login;
      } else {
        await Promise.race([
          login,
          new Promise<void>((resolve) => setTimeout(resolve, 4_000)),
        ]);
      }
    } catch {
      /* IdP indisponível — rotas /dev e fluxo manual em localhost */
    }
    this.peladaContext.refreshFromStorage();
  }

  login(): void {
    this.oauth.initLoginFlow();
  }

  logout(): void {
    this.peladaContext.clearActivePelada();
    this.oauth.logOut();
    void this.router.navigateByUrl('/entrar');
  }

  isLoggedIn(): boolean {
    return this.oauth.hasValidAccessToken();
  }

  getMe(): Promise<MeProfile> {
    return new Promise((resolve, reject) => {
      this.http.get<MeProfile>(`${environment.apiUrl}/me`).subscribe({
        next: (body) => resolve(body),
        error: (err) => reject(err),
      });
    });
  }

  patchMe(phone: string): Promise<MeProfile> {
    return new Promise((resolve, reject) => {
      this.http
        .patch<MeProfile>(`${environment.apiUrl}/me`, { phone })
        .subscribe({
          next: (body) => resolve(body),
          error: (err) => reject(err),
        });
    });
  }

  /** Após login OIDC: início ou completar telefone. */
  async continueAfterLogin(): Promise<void> {
    if (!this.isLoggedIn()) {
      return;
    }
    try {
      const me = await this.getMe();
      if (!me.phone?.trim()) {
        await this.router.navigateByUrl('/entrar/completar');
        return;
      }
      await this.router.navigateByUrl('/inicio');
    } catch {
      await this.router.navigateByUrl('/inicio');
    }
  }
}
