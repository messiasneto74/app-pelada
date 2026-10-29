/** Valores editáveis na tela 3.2 — alinhados a `PeladaRules` (API 3.2-API depois). */

export type Modality = 'futsal' | 'society' | 'campo';

export type PaymentModel = 'PER_MATCH' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type DrawMode = 'BALANCED' | 'RANDOM' | 'MANUAL';

export type FixedGkRotation = 'RESULT' | 'SIDE' | 'MANUAL_ONLY';

export type PeladaRulesFormValues = {
  playersPerTeam: number;
  teamCount: number;
  modality: Modality;
  goalkeeperPerTeam: boolean;
  fixedGoalkeeper: boolean;
  fixedGkRotation: FixedGkRotation;
  fixedListOnly: boolean;
  paymentModel: PaymentModel;
  drawMode: DrawMode;
  drawUseRating: boolean;
  drawUseAttributes: boolean;
  drawUseStyleTags: boolean;
};

export const DEFAULT_PELADA_RULES: PeladaRulesFormValues = {
  playersPerTeam: 6,
  teamCount: 2,
  modality: 'campo',
  goalkeeperPerTeam: false,
  fixedGoalkeeper: false,
  fixedGkRotation: 'MANUAL_ONLY',
  fixedListOnly: false,
  paymentModel: 'PER_MATCH',
  drawMode: 'BALANCED',
  drawUseRating: true,
  drawUseAttributes: true,
  drawUseStyleTags: true,
};

export function validateGoalkeeperToggles(
  goalkeeperPerTeam: boolean,
  fixedGoalkeeper: boolean,
): string | null {
  if (goalkeeperPerTeam && fixedGoalkeeper) {
    return 'Goleiro por time e goleiro fixo no gol não podem ficar ligados ao mesmo tempo.';
  }
  return null;
}

export function validatePeladaRulesForm(values: PeladaRulesFormValues): string | null {
  const gk = validateGoalkeeperToggles(
    values.goalkeeperPerTeam,
    values.fixedGoalkeeper,
  );
  if (gk) {
    return gk;
  }
  if (values.playersPerTeam < 4 || values.playersPerTeam > 11) {
    return 'Jogadores de linha por time: entre 4 e 11.';
  }
  if (values.teamCount < 2 || values.teamCount > 6) {
    return 'Times no sorteio: entre 2 e 6.';
  }
  return null;
}

export function toGoalkeeperMode(values: Pick<
  PeladaRulesFormValues,
  'goalkeeperPerTeam' | 'fixedGoalkeeper'
>): 'ROTATING' | 'FIXED_PER_TEAM' | 'FIXED_GLOBAL' {
  if (values.fixedGoalkeeper) {
    return 'FIXED_GLOBAL';
  }
  if (values.goalkeeperPerTeam) {
    return 'FIXED_PER_TEAM';
  }
  return 'ROTATING';
}

/** Payload alinhado a `PeladaRules.drawWeights` (3.2-API). */
export function toDrawWeights(
  values: Pick<
    PeladaRulesFormValues,
    'drawMode' | 'drawUseRating' | 'drawUseAttributes' | 'drawUseStyleTags'
  >,
): Record<string, unknown> {
  return {
    mode: values.drawMode,
    useRating: values.drawUseRating,
    useAttributes: values.drawUseAttributes,
    useStyleTags: values.drawUseStyleTags,
  };
}
