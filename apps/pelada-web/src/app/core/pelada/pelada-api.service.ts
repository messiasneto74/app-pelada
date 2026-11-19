import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MyPeladaSummary } from './active-pelada.model';

export interface CreatePeladaPayload {
  name: string;
  defaultWeekday: number | null;
  defaultLocation: string;
  photoFile: File | null;
}

export interface PeladaCreatedApi {
  id: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
}

/** Issue #172 (fase 1) — convite de entrada por link/QR, uso único, validade 5h. */
export interface CreatedInviteApi {
  token: string;
  peladaId: string;
  expiresAt: string;
  /** Issue #179b — true quando o convite também foi enviado por e-mail. */
  emailSent: boolean;
}

export interface InvitePreviewApi {
  peladaId: string;
  peladaName: string;
  expiresAt: string;
}

export interface RedeemedInviteApi {
  peladaId: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
}

@Injectable({ providedIn: 'root' })
export class PeladaApiService {
  private readonly http = inject(HttpClient);

  createPelada(payload: CreatePeladaPayload) {
    const form = new FormData();
    form.set('name', payload.name);
    if (payload.defaultWeekday !== null) {
      form.set('defaultWeekday', String(payload.defaultWeekday));
    }
    if (payload.defaultLocation) {
      form.set('defaultLocation', payload.defaultLocation);
    }
    if (payload.photoFile) {
      form.append('photo', payload.photoFile);
    }
    return this.http.post<PeladaCreatedApi>(`${environment.apiUrl}/peladas`, form);
  }

  /** C1 — peladas do usuário autenticado, para restaurar a pelada ativa em sessão/aparelho novo. */
  listMyPeladas(): Promise<MyPeladaSummary[]> {
    return firstValueFrom(
      this.http.get<MyPeladaSummary[]>(`${environment.apiUrl}/me/peladas`),
    );
  }

  createInvite(peladaId: string, email?: string): Promise<CreatedInviteApi> {
    return firstValueFrom(
      this.http.post<CreatedInviteApi>(
        `${environment.apiUrl}/peladas/${peladaId}/invites`,
        email ? { email } : {},
      ),
    );
  }

  previewInvite(token: string): Promise<InvitePreviewApi> {
    return firstValueFrom(
      this.http.get<InvitePreviewApi>(`${environment.apiUrl}/invites/${token}`),
    );
  }

  redeemInvite(token: string): Promise<RedeemedInviteApi> {
    return firstValueFrom(
      this.http.post<RedeemedInviteApi>(
        `${environment.apiUrl}/invites/${token}/redeem`,
        {},
      ),
    );
  }
}
