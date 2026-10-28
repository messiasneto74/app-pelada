import { Injectable, inject, signal } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import {
  ACTIVE_PELADA_STORAGE_KEY,
  ActivePelada,
  StoredActivePelada,
} from './active-pelada.model';

@Injectable({ providedIn: 'root' })
export class PeladaContextService {
  private readonly oauth = inject(OAuthService);
  private readonly activeSignal = signal<ActivePelada | null>(this.loadStored());

  readonly activePelada = this.activeSignal.asReadonly();

  hasActivePelada(): boolean {
    return this.activeSignal() !== null;
  }

  getActivePelada(): ActivePelada | null {
    return this.activeSignal();
  }

  setActivePelada(pelada: ActivePelada): void {
    const prev = this.activeSignal();
    if (
      prev?.photoPreviewUrl?.startsWith('blob:') &&
      prev.photoPreviewUrl !== pelada.photoPreviewUrl
    ) {
      URL.revokeObjectURL(prev.photoPreviewUrl);
    }
    this.activeSignal.set(pelada);
    this.persistMetadata(pelada);
  }

  clearActivePelada(): void {
    const current = this.activeSignal();
    if (current?.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(current.photoPreviewUrl);
    }
    this.activeSignal.set(null);
    this.removeStored();
  }

  /** Re-carrega do sessionStorage (ex.: após login com sub diferente). */
  refreshFromStorage(): void {
    this.activeSignal.set(this.loadStored());
  }

  private storageKey(): string {
    const sub = this.oauth.getIdentityClaims()?.['sub'];
    if (typeof sub === 'string' && sub.length > 0) {
      return `${ACTIVE_PELADA_STORAGE_KEY}:${sub}`;
    }
    return ACTIVE_PELADA_STORAGE_KEY;
  }

  private loadStored(): ActivePelada | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(this.storageKey());
      if (!raw) {
        return null;
      }
      const stored = JSON.parse(raw) as StoredActivePelada;
      if (!stored?.id || !stored?.name) {
        return null;
      }
      return { ...stored, photoPreviewUrl: null };
    } catch {
      return null;
    }
  }

  private persistMetadata(pelada: ActivePelada): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const stored: StoredActivePelada = {
      id: pelada.id,
      name: pelada.name,
      defaultWeekday: pelada.defaultWeekday,
      defaultLocation: pelada.defaultLocation,
    };
    sessionStorage.setItem(this.storageKey(), JSON.stringify(stored));
  }

  private removeStored(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(this.storageKey());
  }
}
