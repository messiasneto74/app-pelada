import { peladaRulesFromApi, peladaRulesToPatchBody } from './pelada-rules-api.mapper';

describe('pelada-rules-api.mapper', () => {
  it('mapeia API → formulário', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 7,
      teamCount: 3,
      modality: 'society',
      goalkeeperMode: 'FIXED_GLOBAL',
      fixedListOnly: true,
      drawWeights: { mode: 'RANDOM', useAttributes: false },
      extra: { paymentModel: 'MONTHLY', fixedGkRotation: 'SIDE' },
    });
    expect(form.playersPerTeam).toBe(7);
    expect(form.fixedGoalkeeper).toBe(true);
    expect(form.drawMode).toBe('RANDOM');
    expect(form.drawUseAttributes).toBe(false);
    expect(form.paymentModel).toBe('MONTHLY');
    expect(form.allowPlayerSelfEdit).toBe(false);
  });

  it('mapeia allowPlayerSelfEdit da API', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      allowPlayerSelfEdit: true,
      drawWeights: {},
      extra: {},
    });
    expect(form.allowPlayerSelfEdit).toBe(true);
  });

  it('mapeia formulário → PATCH', () => {
    const body = peladaRulesToPatchBody({
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperPerTeam: true,
      fixedGoalkeeper: false,
      fixedGkRotation: 'MANUAL_ONLY',
      fixedListOnly: false,
      paymentModel: 'PER_MATCH',
      drawMode: 'BALANCED',
      drawUseRating: true,
      drawUseAttributes: true,
      drawUseStyleTags: false,
      allowPlayerSelfEdit: true,
    });
    expect(body['goalkeeperMode']).toBe('FIXED_PER_TEAM');
    expect(body['allowPlayerSelfEdit']).toBe(true);
    const weights = body['drawWeights'] as Record<string, unknown>;
    expect(weights['useStyleTags']).toBe(false);
  });
});
