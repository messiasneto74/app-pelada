import { Injectable } from '@angular/core';

/**
 * Papel na pelada ativa — stub até endpoint dedicado (F0-6 / issues 3.x).
 * Fluxo L1: criador da pelada é ORGANIZADOR.
 */
@Injectable({ providedIn: 'root' })
export class PeladaOrganizadorContextService {
  isOrganizador(): boolean {
    return true;
  }
}
