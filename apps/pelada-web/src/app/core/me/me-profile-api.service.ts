import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MeProfile } from '../../auth/auth.service';

/** Issue #226 — chamadas da tela "Meu perfil". */
@Injectable({ providedIn: 'root' })
export class MeProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  updateProfile(body: { name?: string; phone?: string }): Promise<MeProfile> {
    return firstValueFrom(this.http.patch<MeProfile>(`${this.base}/me`, body));
  }

  uploadPhoto(file: File): Promise<MeProfile> {
    const form = new FormData();
    form.append('photo', file);
    return firstValueFrom(this.http.post<MeProfile>(`${this.base}/me/photo`, form));
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/me/password`, { currentPassword, newPassword }),
    );
  }

  /** Issue #223 — sair de uma pelada (apaga o jogador e o vínculo). */
  leavePelada(peladaId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/peladas/${peladaId}/membership`));
  }

  /** Fotos exigem login (/uploads) — baixa com o token e devolve um blob: URL. */
  async loadPhotoBlobUrl(url: string): Promise<string> {
    const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
    return URL.createObjectURL(blob);
  }
}

/** Mensagem da API (string ou lista do class-validator) ou um texto padrão. */
export function apiMessage(err: unknown, fallback: string): string {
  const body = (err as { error?: { message?: unknown } })?.error;
  const m = body?.message;
  if (Array.isArray(m) && typeof m[0] === 'string') {
    return m[0];
  }
  if (typeof m === 'string' && m.length > 0) {
    return m;
  }
  return fallback;
}
