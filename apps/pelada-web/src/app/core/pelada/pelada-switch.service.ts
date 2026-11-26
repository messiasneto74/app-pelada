import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PresenceSessionService } from '../presence/presence-session.service';
import type { MyPeladaSummary } from './active-pelada.model';
import { PeladaApiService } from './pelada-api.service';
import { PeladaContextService } from './pelada-context.service';
import { PeladaOrganizadorContextService } from './pelada-organizador-context.service';

/** Issue #225 — quem joga em mais de uma pelada troca qual está ativa no app. */
@Injectable({ providedIn: 'root' })
export class PeladaSwitchService {
  private readonly api = inject(PeladaApiService);
  private readonly context = inject(PeladaContextService);
  private readonly orgContext = inject(PeladaOrganizadorContextService);
  private readonly presence = inject(PresenceSessionService);
  private readonly router = inject(Router);

  listMine(): Promise<MyPeladaSummary[]> {
    return this.api.listMyPeladas();
  }

  async switchTo(pelada: MyPeladaSummary): Promise<void> {
    this.context.setActivePelada({
      id: pelada.id,
      name: pelada.name,
      defaultWeekday: pelada.defaultWeekday,
      defaultLocation: pelada.defaultLocation ?? '',
      photoPreviewUrl: null,
    });
    // A partida aberta era da pelada anterior.
    this.presence.setActiveMatchId(null);
    this.orgContext.refreshMembership(pelada.id);
    await this.router.navigate(['/inicio']);
  }
}

export function peladaRoleLabel(role: string): string {
  return role === 'ORGANIZADOR' ? 'Organizador' : 'Jogador';
}
