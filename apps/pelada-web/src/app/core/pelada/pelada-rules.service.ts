import { Injectable, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import {
  DEFAULT_PELADA_RULES,
  PeladaRulesFormValues,
} from './pelada-rules.model';

const RULES_STORAGE_PREFIX = 'pelada-rules';

@Injectable({ providedIn: 'root' })
export class PeladaRulesService {
  private readonly oauth = inject(OAuthService);

  getDefaultRules(peladaId: string): PeladaRulesFormValues {
    const stored = this.load(peladaId);
    return stored ?? { ...DEFAULT_PELADA_RULES };
  }

  saveDefaultRules(peladaId: string, values: PeladaRulesFormValues): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(this.storageKey(peladaId), JSON.stringify(values));
  }

  hasSavedRules(peladaId: string): boolean {
    return this.load(peladaId) !== null;
  }

  private load(peladaId: string): PeladaRulesFormValues | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(this.storageKey(peladaId));
      if (!raw) {
        return null;
      }
      return { ...DEFAULT_PELADA_RULES, ...(JSON.parse(raw) as PeladaRulesFormValues) };
    } catch {
      return null;
    }
  }

  private storageKey(peladaId: string): string {
    const sub = this.oauth.getIdentityClaims()?.['sub'];
    const user =
      typeof sub === 'string' && sub.length > 0 ? sub : 'anonymous';
    return `${RULES_STORAGE_PREFIX}:${user}:${peladaId}`;
  }
}
