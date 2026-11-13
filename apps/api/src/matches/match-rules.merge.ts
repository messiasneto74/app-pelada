import type { GoalkeeperMode, PeladaRules } from '@prisma/client';
import {
  assertGoalkeeperExclusive,
  mergeExtra,
} from '../peladas/pelada-rules.validation';

export type EffectiveMatchRules = {
  playersPerTeam: number;
  teamCount: number;
  modality: string;
  goalkeeperMode: GoalkeeperMode;
  presenceMode: string;
  capacity: number | null;
  allowPlayerSelfEdit: boolean;
  fixedListOnly: boolean;
  drawWeights: Record<string, unknown>;
  extra: Record<string, unknown>;
};

export type MatchRulesOverrideJson = Record<string, unknown>;

export function mergeEffectiveMatchRules(
  defaults: PeladaRules,
  override: MatchRulesOverrideJson | null | undefined,
): EffectiveMatchRules {
  const o = override ?? {};
  const mergedExtra = mergeExtra(
    defaults.extra,
    typeof o['extra'] === 'object' && o['extra'] && !Array.isArray(o['extra'])
      ? (o['extra'] as Record<string, unknown>)
      : undefined,
  );
  const goalkeeperMode =
    (o['goalkeeperMode'] as GoalkeeperMode | undefined) ??
    defaults.goalkeeperMode;

  assertGoalkeeperExclusive(goalkeeperMode, mergedExtra);

  return {
    playersPerTeam:
      typeof o['playersPerTeam'] === 'number'
        ? o['playersPerTeam']
        : defaults.playersPerTeam,
    teamCount:
      typeof o['teamCount'] === 'number' ? o['teamCount'] : defaults.teamCount,
    modality:
      typeof o['modality'] === 'string' ? o['modality'] : defaults.modality,
    goalkeeperMode,
    presenceMode:
      typeof o['presenceMode'] === 'string'
        ? o['presenceMode']
        : defaults.presenceMode,
    capacity:
      typeof o['capacity'] === 'number' ? o['capacity'] : defaults.capacity,
    allowPlayerSelfEdit:
      typeof o['allowPlayerSelfEdit'] === 'boolean'
        ? o['allowPlayerSelfEdit']
        : defaults.allowPlayerSelfEdit,
    fixedListOnly:
      typeof o['fixedListOnly'] === 'boolean'
        ? o['fixedListOnly']
        : defaults.fixedListOnly,
    drawWeights:
      typeof o['drawWeights'] === 'object' &&
      o['drawWeights'] &&
      !Array.isArray(o['drawWeights'])
        ? { ...(defaults.drawWeights as object), ...(o['drawWeights'] as object) }
        : (defaults.drawWeights as Record<string, unknown>),
    extra: mergedExtra,
  };
}

export function mergeOverridePatch(
  current: MatchRulesOverrideJson | null | undefined,
  patch: MatchRulesOverrideJson,
): MatchRulesOverrideJson {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...current }
      : {};
  const nextExtra = mergeExtra(
    base['extra'],
    patch['extra'] as Record<string, unknown> | undefined,
  );
  return {
    ...base,
    ...patch,
    ...(patch['extra'] !== undefined && { extra: nextExtra }),
  };
}
