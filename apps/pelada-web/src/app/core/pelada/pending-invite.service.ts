import { Injectable } from '@angular/core';

const STORAGE_KEY = 'pelada.pendingInviteToken';

/**
 * Guarda o token do convite (issue #172) enquanto o usuário faz login —
 * o redirect do Keycloak sempre volta pra `/entrar` (ver auth.config.ts),
 * então a tela `/convite/:token` não sobrevive ao fluxo OIDC por si só.
 */
@Injectable({ providedIn: 'root' })
export class PendingInviteService {
  set(token: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  /** Lê e limpa — o convite só deve ser tentado uma vez após o login. */
  consume(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const token = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return token;
  }
}
