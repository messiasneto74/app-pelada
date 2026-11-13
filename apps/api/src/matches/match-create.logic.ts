import type { PeladaRules } from '@prisma/client';
import type { MatchRulesOverrideJson } from './match-rules.merge';
import { mergeOverridePatch } from './match-rules.merge';

/** Copia regras da pelada no momento da criação da partida (§3.3-API). */
export function peladaRulesToMatchSnapshot(
  rules: PeladaRules,
  capturedAt: Date = new Date(),
): MatchRulesOverrideJson {
  return {
    rulesSnapshotAt: capturedAt.toISOString(),
    playersPerTeam: rules.playersPerTeam,
    teamCount: rules.teamCount,
    modality: rules.modality,
    goalkeeperMode: rules.goalkeeperMode,
    presenceMode: rules.presenceMode,
    capacity: rules.capacity,
    allowPlayerSelfEdit: rules.allowPlayerSelfEdit,
    fixedListOnly: rules.fixedListOnly,
    drawWeights: rules.drawWeights as Record<string, unknown>,
    extra: rules.extra as Record<string, unknown>,
  };
}

export function buildInitialMatchRulesOverride(
  defaults: PeladaRules,
  dtoOverride?: Record<string, unknown> | null,
): MatchRulesOverrideJson {
  const snapshot = peladaRulesToMatchSnapshot(defaults);
  if (!dtoOverride || Object.keys(dtoOverride).length === 0) {
    return snapshot;
  }
  return mergeOverridePatch(snapshot, dtoOverride);
}
