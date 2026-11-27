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
        },
        error: () => {
          this.roleByPeladaId.update((m) => ({
            ...m,
            [peladaId]: 'JOGADOR',
          }));
        },
      });
  }

  /**
   * Issue #225 — ao trocar de pelada o papel já vem na lista "minhas peladas":
   * grava na hora pra tela nova não mostrar (nem por um instante) atalhos do
   * papel errado enquanto o GET .../membership não volta.
   */
  setKnownRole(peladaId: string, role: string): void {
    const known: PeladaMemberRole = role === 'ORGANIZADOR' ? 'ORGANIZADOR' : 'JOGADOR';
    this.roleByPeladaId.update((m) => ({ ...m, [peladaId]: known }));
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
