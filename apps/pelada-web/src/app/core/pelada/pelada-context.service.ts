import { Injectable, signal } from '@angular/core';
import {
  ACTIVE_PELADA_STORAGE_KEY,
  ActivePelada,
  StoredActivePelada,
} from './active-pelada.model';

@Injectable({ providedIn: 'root' })
export class PeladaContextService {
  private readonly activeSignal = signal<ActivePelada | null>(this.loadStored());

  readonly activePelada = this.activeSignal.asReadonly();

  hasActivePelada(): boolean {
    return this.activeSignal() !== null;
  }

  getActivePelada(): ActivePelada | null {
    return this.activeSignal();
  }

  setActivePelada(pelada: ActivePelada): void {
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

  private loadStored(): ActivePelada | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(ACTIVE_PELADA_STORAGE_KEY);
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
    sessionStorage.setItem(ACTIVE_PELADA_STORAGE_KEY, JSON.stringify(stored));
  }

  private removeStored(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(ACTIVE_PELADA_STORAGE_KEY);
  }
}
