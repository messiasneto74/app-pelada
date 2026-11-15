import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PeladaApiService } from '../core/pelada/pelada-api.service';
import { PeladaContextService } from '../core/pelada/pelada-context.service';
import { buildAuthConfig, NATIVE_REDIRECT_URI } from './auth.config';
import { nativeBridge } from './native-bridge';

export type MeProfile = {
  id: string;
  keycloakSub: string;
  email: string | null;
  phone: string | null;
};

export type RegisterAccountInput = {
  email: string;
  password: string;
  name: string;
};

/** Mensagem amigável a partir do erro do token endpoint / password grant. */
export function mapPasswordLoginError(err: unknown): string {
  const http = err as HttpErrorResponse | undefined;
  const status = http?.status;
  const body = http?.error as
    | { error?: string; error_description?: string }
    | string
    | null
    | undefined;
  const code =
    typeof body === 'object' && body
      ? body.error
      : typeof body === 'string'
        ? body
        : undefined;

  if (status === 401 || code === 'invalid_grant') {
    return 'E-mail ou senha incorretos.';
  }
  if (status === 0 || status === 503) {
    return 'Não foi possível contactar o Keycloak. Verifique se o IdP está no ar.';
  }
  if (code === 'unauthorized_client') {
    return 'Direct Access Grants desligado no client pelada-web. Ative no Keycloak ou rode keycloak:reset.';
  }
  return 'Não foi possível entrar. Tente novamente.';
}

export function mapRegisterError(err: unknown): string {
  const http = err as HttpErrorResponse | undefined;
  const status = http?.status;
  const message =
    typeof http?.error === 'object' && http?.error && 'message' in http.error
      ? String((http.error as { message: unknown }).message)
      : undefined;

  if (status === 409) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (status === 400) {
    return message || 'Dados inválidos. Confira e-mail e senha (mín. 8 caracteres).';
  }
  if (status === 0 || status === 503) {
    return 'Cadastro indisponível no momento (Keycloak/API).';
  }
  return 'Não foi possível criar a conta. Tente novamente.';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauth = inject(OAuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly peladaContext = inject(PeladaContextService);
  private readonly peladaApi = inject(PeladaApiService);

  private configured = false;
  private oauthSideEffectsBound = false;
  private nativeDeepLinkListenerBound = false;
  private continueAfterLoginInFlight: Promise<void> | null = null;

  async init(): Promise<void> {
    if (!this.configured) {
      this.oauth.configure(buildAuthConfig());
      this.configured = true;
    }
    this.bindOAuthSideEffects();
    this.bindNativeDeepLinkListener();
    try {
      const login = this.oauth.loadDiscoveryDocumentAndTryLogin();
      void login.finally(() => {
        this.peladaContext.refreshFromStorage();
      });
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

  /** Dev: bootstrap não bloqueia no OIDC; ao concluir login, recarrega pelada do sub correto. */
  private bindOAuthSideEffects(): void {
    if (this.oauthSideEffectsBound) {
      return;
    }
    this.oauthSideEffectsBound = true;
    this.oauth.events.subscribe((event) => {
      if (
        event.type !== 'token_received' &&
        event.type !== 'token_refreshed' &&
        event.type !== 'silently_refreshed'
      ) {
        return;
      }
      this.peladaContext.refreshFromStorage();
      if (environment.production) {
        return;
      }
      const path = this.router.url.split('?')[0];
      if (path === '/entrar' && this.isLoggedIn()) {
        void this.continueAfterLogin();
      }
    });
  }

  /**
   * No app empacotado (Capacitor), o fluxo de código roda no navegador do
   * sistema (ver `openUri` em {@link buildAuthConfig}); o retorno chega via
   * deep link (`com.pelada.app://callback`) e não por `window.location`.
   */
  private bindNativeDeepLinkListener(): void {
    if (this.nativeDeepLinkListenerBound || !Capacitor.isNativePlatform()) {
      return;
    }
    this.nativeDeepLinkListenerBound = true;
    nativeBridge.onAppUrlOpen((event) => {
      if (!event.url.startsWith(NATIVE_REDIRECT_URI)) {
        return;
      }
      void nativeBridge.closeSystemBrowser().catch(() => {
        /* já pode estar fechado pelo usuário */
      });
      const query = event.url.slice(NATIVE_REDIRECT_URI.length);
      this.oauth
        .tryLoginCodeFlow({ customHashFragment: `?${query.replace(/^[?]/, '')}` })
        .then(() => {
          this.peladaContext.refreshFromStorage();
          if (this.isLoggedIn()) {
            void this.continueAfterLogin();
          }
        })
        .catch(() => {
          /* erro vira evento OAuthErrorEvent, tratado em bindOAuthSideEffects se necessário */
        });
    });
  }

  /**
   * Login in-app (Resource Owner Password / Direct Access Grants).
   * Não redireciona para a UI do Keycloak.
   */
  async loginWithPassword(username: string, password: string): Promise<void> {
    await this.ensureDiscovery();
    await this.oauth.fetchTokenUsingPasswordFlowAndLoadUserProfile(
      username.trim(),
      password,
    );
    this.peladaContext.refreshFromStorage();
  }

  /** Cria usuário no Keycloak via API Nest (`POST /register`) e faz login. */
  async registerAccount(input: RegisterAccountInput): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/register`, {
        email: input.email.trim(),
        password: input.password,
        name: input.name.trim(),
      }),
    );
    await this.loginWithPassword(input.email, input.password);
  }

  /**
   * Authorization Code + PKCE (redirect Keycloak) — legado / IdP Google.
   * Preferir {@link loginWithPassword} para permanecer no Resenha.
   */
  loginWithRedirect(): void {
    this.oauth.initLoginFlow();
  }

  /**
   * Login/cadastro via Google, com o Keycloak como IdP broker
   * (`kc_idp_hint` pula a tela própria do Keycloak e vai direto pro Google).
   */
  async loginWithGoogle(): Promise<void> {
    await this.ensureDiscovery();
    this.oauth.initLoginFlow('', { kc_idp_hint: 'google' });
  }

  /** @deprecated Use {@link loginWithPassword} ou {@link loginWithRedirect}. */
  login(): void {
    this.loginWithRedirect();
  }

  logout(): void {
    this.peladaContext.clearActivePelada();
    // true = limpa tokens localmente sem ir à UI de logout do Keycloak
    this.oauth.logOut(true);
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
    if (!this.continueAfterLoginInFlight) {
      this.continueAfterLoginInFlight = this.runContinueAfterLogin().finally(() => {
        this.continueAfterLoginInFlight = null;
      });
    }
    await this.continueAfterLoginInFlight;
  }

  private async runContinueAfterLogin(): Promise<void> {
    try {
      const me = await this.getMe();
      if (!me.phone?.trim()) {
        await this.router.navigateByUrl('/entrar/completar', { replaceUrl: true });
        return;
      }
    } catch {
      await this.router.navigateByUrl('/inicio', { replaceUrl: true });
      return;
    }
    const target = await this.resolveAppEntryAfterProfile();
    await this.router.navigateByUrl(target, { replaceUrl: true });
  }

  /** Mesma decisão que `peladaOnboardingGuard` — evita ping-pong via `/inicio`. */
  private async resolveAppEntryAfterProfile(): Promise<string> {
    if (this.peladaContext.hasActivePelada()) {
      return '/inicio';
    }
    try {
      const peladas = await this.peladaApi.listMyPeladas();
      const first = peladas[0];
      if (first) {
        this.peladaContext.setActivePelada({
          id: first.id,
          name: first.name,
          defaultWeekday: first.defaultWeekday,
          defaultLocation: first.defaultLocation ?? '',
          photoPreviewUrl: null,
        });
        return '/inicio';
      }
    } catch {
      /* API indisponível — segue para criar pelada. */
    }
    return '/onboarding/pelada';
  }

  private async ensureDiscovery(): Promise<void> {
    if (!this.configured) {
      this.oauth.configure(buildAuthConfig());
      this.configured = true;
    }
    if (!this.oauth.tokenEndpoint) {
      await this.oauth.loadDiscoveryDocument();
    }
  }
}
