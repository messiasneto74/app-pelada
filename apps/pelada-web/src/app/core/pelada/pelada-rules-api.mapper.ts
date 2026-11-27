import { parseTagsText } from '../roster/player-profile-edit.logic';
import type { PeladaRulesFormValues } from './pelada-rules.model';
import {
  DEFAULT_PELADA_RULES,
  toDrawWeights,
  toGoalkeeperMode,
} from './pelada-rules.model';

export type PeladaRulesApiDto = {
  peladaId: string;
  playersPerTeam: number;
  teamCount: number;
  modality: string;
  goalkeeperMode: string;
  fixedListOnly: boolean;
  allowPlayerSelfEdit?: boolean;
  drawWeights: Record<string, unknown>;
  extra: Record<string, unknown>;
};

export function peladaRulesFromApi(dto: PeladaRulesApiDto): PeladaRulesFormValues {
  const extra = dto.extra ?? {};
  const draw = dto.drawWeights ?? {};
  const gkMode = dto.goalkeeperMode;
  return {
    playersPerTeam: dto.playersPerTeam,
    teamCount: dto.teamCount,
    modality: (dto.modality as PeladaRulesFormValues['modality']) ?? 'campo',
    goalkeeperPerTeam: gkMode === 'FIXED_PER_TEAM',
    fixedGoalkeeper: gkMode === 'FIXED_GLOBAL',
    fixedGkRotation:
      (extra['fixedGkRotation'] as PeladaRulesFormValues['fixedGkRotation']) ??
      DEFAULT_PELADA_RULES.fixedGkRotation,
    fixedListOnly: dto.fixedListOnly,
    allowPlayerSelfEdit: dto.allowPlayerSelfEdit === true,
    paymentModel:
      (extra['paymentModel'] as PeladaRulesFormValues['paymentModel']) ??
      DEFAULT_PELADA_RULES.paymentModel,
    drawMode:
      (draw['mode'] as PeladaRulesFormValues['drawMode']) ??
      DEFAULT_PELADA_RULES.drawMode,
    drawUseRating: draw['useRating'] !== false,
    drawUseAttributes: draw['useAttributes'] !== false,
    drawUseStyleTags: draw['useStyleTags'] !== false,
    summaryTemplate:
      typeof extra['summaryTemplate'] === 'string'
        ? (extra['summaryTemplate'] as string)
        : DEFAULT_PELADA_RULES.summaryTemplate,
    customStyleTagsText: Array.isArray(extra['customStyleTags'])
      ? (extra['customStyleTags'] as unknown[])
          .filter((t): t is string => typeof t === 'string')
          .join(', ')
      : DEFAULT_PELADA_RULES.customStyleTagsText,
    autoPromoteAfterPresences:
      typeof extra['autoPromoteAfterPresences'] === 'number' &&
      Number.isFinite(extra['autoPromoteAfterPresences']) &&
      (extra['autoPromoteAfterPresences'] as number) >= 0
        ? Math.floor(extra['autoPromoteAfterPresences'] as number)
        : DEFAULT_PELADA_RULES.autoPromoteAfterPresences,
    feeCents:
      typeof extra['feeCents'] === 'number' &&
      Number.isFinite(extra['feeCents']) &&
      (extra['feeCents'] as number) >= 0
        ? Math.floor(extra['feeCents'] as number)
        : DEFAULT_PELADA_RULES.feeCents,
    autoFillQueueOnCapacityIncrease: extra['autoFillQueueOnCapacityIncrease'] === true,
  };
}

export function peladaRulesToPatchBody(
  values: PeladaRulesFormValues,
): Record<string, unknown> {
  return {
    playersPerTeam: values.playersPerTeam,
    teamCount: values.teamCount,
    modality: values.modality,
    goalkeeperMode: toGoalkeeperMode(values),
    fixedListOnly: values.fixedListOnly,
    allowPlayerSelfEdit: values.allowPlayerSelfEdit,
    drawWeights: toDrawWeights(values),
    extra: {
      paymentModel: values.paymentModel,
      fixedGkRotation: values.fixedGkRotation,
      goalkeeperPerTeam: values.goalkeeperPerTeam,
      fixedGoalkeeper: values.fixedGoalkeeper,
      summaryTemplate: values.summaryTemplate,
      customStyleTags: parseTagsText(values.customStyleTagsText),
      autoPromoteAfterPresences: values.autoPromoteAfterPresences,
      feeCents: values.feeCents,
      autoFillQueueOnCapacityIncrease: values.autoFillQueueOnCapacityIncrease,
    },
  };
}
