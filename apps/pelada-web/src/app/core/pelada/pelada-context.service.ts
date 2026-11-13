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
  private readonly initialPelada = this.loadStored();
  private readonly activeSignal = signal<ActivePelada | null>(
    this.initialPelada,
  );
  /** `sub` do OIDC dono da pelada em memória (isolamento entre usuários na mesma aba). */
  private activeMemorySub: string | null = this.initialPelada
    ? this.readCurrentSub()
    : null;

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
    this.activeMemorySub = this.readCurrentSub();
    this.persistMetadata(pelada);
  }

  clearActivePelada(): void {
    const current = this.activeSignal();
    if (current?.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(current.photoPreviewUrl);
    }
    this.activeSignal.set(null);
    this.activeMemorySub = null;
    this.removeStored();
  }

  /**
   * Re-carrega do sessionStorage (ex.: após login com sub diferente).
   * Não zera pelada já definida em memória quando o cache está vazio — evita
   * perder a ativa logo após `POST /peladas` se `token_refreshed` dispara antes
   * da persistência no chave escopada ao `sub`, ou se houve troca de chave legacy.
   */
  refreshFromStorage(): void {
    const stored = this.loadStoredWithLegacyMigration();
    const current = this.activeSignal();

    if (stored) {
      const merged =
        current?.id === stored.id && current.photoPreviewUrl
          ? { ...stored, photoPreviewUrl: current.photoPreviewUrl }
          : { ...stored, photoPreviewUrl: null };
      this.activeSignal.set(merged);
      this.activeMemorySub = this.readCurrentSub();
      return;
    }

    if (current) {
      const sub = this.readCurrentSub();
      if (
        this.activeMemorySub !== null &&
        sub !== null &&
        this.activeMemorySub !== sub
      ) {
        this.discardInMemoryActive();
        return;
      }
      this.activeMemorySub = sub ?? this.activeMemorySub;
      this.persistMetadata(current);
      return;
    }

    this.activeSignal.set(null);
    this.activeMemorySub = null;
  }

  private readCurrentSub(): string | null {
    const sub = this.oauth.getIdentityClaims()?.['sub'];
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  }

  private discardInMemoryActive(): void {
    const current = this.activeSignal();
    if (current?.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(current.photoPreviewUrl);
    }
    this.activeSignal.set(null);
    this.activeMemorySub = null;
  }

  private storageKey(): string {
    const sub = this.oauth.getIdentityClaims()?.['sub'];
    if (typeof sub === 'string' && sub.length > 0) {
      return `${ACTIVE_PELADA_STORAGE_KEY}:${sub}`;
    }
    return ACTIVE_PELADA_STORAGE_KEY;
  }

  private loadStored(): ActivePelada | null {
    return this.loadStoredWithLegacyMigration();
  }

  private loadStoredWithLegacyMigration(): ActivePelada | null {
    const scopedKey = this.storageKey();
    const fromScoped = this.readActiveFromSession(scopedKey);
    if (fromScoped) {
      return fromScoped;
    }

    const legacyKey = ACTIVE_PELADA_STORAGE_KEY;
    if (scopedKey === legacyKey) {
      return null;
    }

    const legacy = this.readActiveFromSession(legacyKey);
    if (legacy) {
      sessionStorage.setItem(
        scopedKey,
        JSON.stringify(this.toStoredMetadata(legacy)),
      );
      sessionStorage.removeItem(legacyKey);
      return legacy;
    }

    return null;
  }

  private readActiveFromSession(key: string): ActivePelada | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(key);
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

  private toStoredMetadata(pelada: ActivePelada): StoredActivePelada {
    return {
      id: pelada.id,
      name: pelada.name,
      defaultWeekday: pelada.defaultWeekday,
      defaultLocation: pelada.defaultLocation,
    };
  }

  private persistMetadata(pelada: ActivePelada): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const stored = this.toStoredMetadata(pelada);
    sessionStorage.setItem(this.storageKey(), JSON.stringify(stored));
    const scoped = this.storageKey();
    if (scoped !== ACTIVE_PELADA_STORAGE_KEY) {
      sessionStorage.removeItem(ACTIVE_PELADA_STORAGE_KEY);
    }
  }

  private removeStored(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(this.storageKey());
    sessionStorage.removeItem(ACTIVE_PELADA_STORAGE_KEY);
  }
}
