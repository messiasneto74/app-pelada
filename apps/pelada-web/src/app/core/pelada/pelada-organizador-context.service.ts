import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type PeladaMemberRole = 'ORGANIZADOR' | 'JOGADOR';

export type PeladaMembershipDto = {
  peladaId: string;
  role: PeladaMemberRole;
};

@Injectable({ providedIn: 'root' })
export class PeladaOrganizadorContextService {
  private readonly http = inject(HttpClient);
  private readonly roleByPeladaId = signal<Record<string, PeladaMemberRole>>({});

  /** Default seguro: `false` até `GET .../membership` confirmar ORGANIZADOR. */
  isOrganizador(peladaId: string): boolean {
    return this.roleByPeladaId()[peladaId] === 'ORGANIZADOR';
  }

  refreshMembership(peladaId: string): void {
    this.http
      .get<PeladaMembershipDto>(
        `${environment.apiUrl}/peladas/${peladaId}/membership`,
      )
      .subscribe({
        next: (body) => {
          this.roleByPeladaId.update((m) => ({
            ...m,
            [peladaId]: body.role,
          }));
        },
        error: () => {
          this.roleByPeladaId.update((m) => ({
            ...m,
            [peladaId]: 'JOGADOR',
          }));
        },
      });
  }

  /** Apenas testes — injeta papel sem HTTP. */
  setRoleForTests(peladaId: string, role: PeladaMemberRole | undefined): void {
    this.roleByPeladaId.update((m) => {
      if (role === undefined) {
        const { [peladaId]: _removed, ...rest } = m;
        return rest;
      }
      return { ...m, [peladaId]: role };
    });
  }
}
