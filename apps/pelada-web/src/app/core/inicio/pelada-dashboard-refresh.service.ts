import { Injectable, signal } from '@angular/core';

/**
 * Invalida cache local do resumo do Início quando o caixa muda (§3.9 → §3.1).
 */
@Injectable({ providedIn: 'root' })
export class PeladaDashboardRefreshService {
  private readonly generation = signal(0);

  readonly refreshToken = this.generation.asReadonly();

  notifyCashSummaryChanged(): void {
    this.generation.update((n) => n + 1);
  }
}
