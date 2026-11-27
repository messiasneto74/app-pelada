import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type PeladaMemberRole = 'ORGANIZADOR' | 'JOGADOR';

export type PeladaMembershipDto = {
  peladaId: string;
  role: PeladaMemberRole;
  /** Issue #232 — quem criou a pelada (define quem é adm). */
  isOwner?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PeladaOrganizadorContextService {
  private readonly http = inject(HttpClient);
  private readonly roleByPeladaId = signal<Record<string, PeladaMemberRole>>({});
  private readonly ownerByPeladaId = signal<Record<string, boolean>>({});

  /** Issue #232 — só o dono torna alguém adm ou tira o cargo. */
  isOwner(peladaId: string): boolean {
    return this.ownerByPeladaId()[peladaId] === true;
  }

  /** Default seguro: `false` até `GET .../membership` confirmar ORGANIZADOR. */
  isOrganizador(peladaId: string): boolean {
    return this.roleByPeladaId()[peladaId] === 'ORGANIZADOR';
  }

  /** `true` só depois de a API confirmar JOGADOR (evita piscar a UI do organizador). */
  isJogador(peladaId: string): boolean {
    return this.roleByPeladaId()[peladaId] === 'JOGADOR';
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
          this.ownerByPeladaId.update((m) => ({ ...m, [peladaId]: body.isOwner === true }));
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
