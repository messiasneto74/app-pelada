import {
  suggestFormat,
  type FormatRulesInput,
  type SuggestFormatResult,
} from '@pelada/core';
import type { PeladaRulesFormValues } from '../pelada/pelada-rules.model';

export function buildFormatRulesInput(
  values: Pick<PeladaRulesFormValues, 'playersPerTeam' | 'teamCount'>,
  matchCapacity: number,
): FormatRulesInput {
  const formula = values.playersPerTeam * values.teamCount * 2;
  return {
    playersPerTeam: values.playersPerTeam,
    teamCount: values.teamCount,
    capacity: matchCapacity === formula ? null : matchCapacity,
  };
}

/** História 45 — antes de fechar lista (L45). */
export function evaluateFormatBeforeClose(
  confirmedCount: number,
  rules: Pick<PeladaRulesFormValues, 'playersPerTeam' | 'teamCount'>,
  matchCapacity: number,
): SuggestFormatResult {
  const input = buildFormatRulesInput(rules, matchCapacity);
  return suggestFormat(confirmedCount, input);
}
