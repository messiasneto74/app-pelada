import type { PeladaPlayerProfileDto } from './pelada-player-profile-api.model';
import type { PlayerPaymentPlan } from './pelada-player-profile-api.model';
import {
  PLAYER_PROFILE_ATTRIBUTES,
  type PlayerProfileAttributeKey,
} from './player-profile.logic';

export type PlayerProfileEditForm = {
  rating: number;
  tagsText: string;
  paymentPlan: PlayerPaymentPlan;
  attributes: Record<PlayerProfileAttributeKey, number>;
};

export type PatchPlayerProfileBody = {
  rating?: number;
  tags?: string[];
  paymentPlan?: PlayerPaymentPlan;
  attributes?: Record<string, number>;
};

export function editProfileButtonLabel(isOrganizador: boolean): string {
  return isOrganizador ? 'Editar perfil (adm)' : 'Editar meu perfil';
}

export function profileToEditForm(
  profile: PeladaPlayerProfileDto,
): PlayerProfileEditForm {
  const attributes = {} as Record<PlayerProfileAttributeKey, number>;
  for (const { key } of PLAYER_PROFILE_ATTRIBUTES) {
    attributes[key] = clampAttribute(profile.attributes[key]);
  }
  return {
    rating: clampRating(profile.rating ?? 5),
    tagsText: profile.tags.join(', '),
    paymentPlan: profile.paymentPlan ?? 'PER_MATCH',
    attributes,
  };
}

export function parseTagsText(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

export function buildPatchFromForm(
  form: PlayerProfileEditForm,
  isOrganizador: boolean,
): PatchPlayerProfileBody {
  const base: PatchPlayerProfileBody = {
    rating: clampRating(form.rating),
    tags: parseTagsText(form.tagsText),
    attributes: { ...form.attributes },
  };
  if (isOrganizador) {
    base.paymentPlan = form.paymentPlan;
  }
  return base;
}

export function clampRating(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 5;
  }
  return Math.min(10, Math.max(1, Math.round(value)));
}

export function clampAttribute(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 5;
  }
  return Math.min(10, Math.max(1, Math.round(value)));
}
