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
      extra: {
        paymentModel: 'MONTHLY',
        fixedGkRotation: 'SIDE',
        summaryTemplate: 'Zoação: {artilheiro}!',
      },
    });
    expect(form.playersPerTeam).toBe(7);
    expect(form.fixedGoalkeeper).toBe(true);
    expect(form.drawMode).toBe('RANDOM');
    expect(form.drawUseAttributes).toBe(false);
    expect(form.paymentModel).toBe('MONTHLY');
    expect(form.allowPlayerSelfEdit).toBe(false);
    expect(form.summaryTemplate).toBe('Zoação: {artilheiro}!');
  });

  it('sem summaryTemplate em extra, usa o padrão (string vazia)', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
      extra: {},
    });
    expect(form.summaryTemplate).toBe('');
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
      unpaidPolicy: 'BLOCK',
      presenceMode: 'NAME_LIST',
      waitlistSlots: 7,
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
      summaryTemplate: 'Hoje foi animal!',
      customStyleTagsText: 'zagueiro de área, bate escanteio',
      autoPromoteAfterPresences: 5,
      feeCents: 2000,
      roundMinutes: 12,
      autoFillQueueOnCapacityIncrease: true,
    });
    expect(body['goalkeeperMode']).toBe('FIXED_PER_TEAM');
    expect(body['allowPlayerSelfEdit']).toBe(true);
    const weights = body['drawWeights'] as Record<string, unknown>;
    expect(weights['useStyleTags']).toBe(false);
    const extra = body['extra'] as Record<string, unknown>;
    expect(extra['summaryTemplate']).toBe('Hoje foi animal!');
    expect(extra['customStyleTags']).toEqual([
      'zagueiro de área',
      'bate escanteio',
    ]);
    expect(extra['autoPromoteAfterPresences']).toBe(5);
    expect(extra['feeCents']).toBe(2000);
    expect(extra['roundMinutes']).toBe(12);
    expect(extra['autoFillQueueOnCapacityIncrease']).toBe(true);
    expect(extra['unpaidPolicy']).toBe('BLOCK');
    expect(body['presenceMode']).toBe('NAME_LIST');
    expect(extra['waitlistSlots']).toBe(7);
  });

  it('issues #234 e #263 — presença, lista de espera e quem não pagou: API → formulário', () => {
    const base = {
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
    };
    expect(peladaRulesFromApi({ ...base, extra: {} } as never).unpaidPolicy).toBe('CHARGE');
    expect(peladaRulesFromApi({ ...base, extra: { unpaidPolicy: 'BLOCK' } } as never).unpaidPolicy).toBe('BLOCK');
    const a = peladaRulesFromApi({ ...base, presenceMode: 'NAME_LIST', extra: { waitlistSlots: 7 } } as never);
    expect(a.presenceMode).toBe('NAME_LIST');
    expect(a.waitlistSlots).toBe(7);
    const b = peladaRulesFromApi({ ...base, presenceMode: 'QUALQUER', extra: { waitlistSlots: -3 } } as never);
    expect(b.presenceMode).toBe('ORGANIZER_CLOSES');
    expect(b.waitlistSlots).toBe(0);
  });

  it('issue #229 — tempo de cada partida: API → formulário, com padrão e limites', () => {
    const base = {
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
    };
    expect(peladaRulesFromApi({ ...base, extra: { roundMinutes: 8 } } as never).roundMinutes).toBe(8);
    expect(peladaRulesFromApi({ ...base, extra: {} } as never).roundMinutes).toBe(20);
    expect(peladaRulesFromApi({ ...base, extra: { roundMinutes: 999 } } as never).roundMinutes).toBe(20);
  });

  it('issue #190 — mapeia feeCents (API → formulário, round-trip)', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
      extra: { feeCents: 1500 },
    });
    expect(form.feeCents).toBe(1500);
  });

  it('sem feeCents em extra, usa o padrão (0)', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
      extra: {},
    });
    expect(form.feeCents).toBe(0);
  });

  it('issue #179 — mapeia autoPromoteAfterPresences (API → formulário, round-trip)', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
      extra: { autoPromoteAfterPresences: 4 },
    });
    expect(form.autoPromoteAfterPresences).toBe(4);
  });

  it('sem autoPromoteAfterPresences em extra, usa o padrão (0 — desativado)', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
      extra: {},
    });
    expect(form.autoPromoteAfterPresences).toBe(0);
  });

  it('issue #188 — mapeia customStyleTags (API → formulário, round-trip)', () => {
    const form = peladaRulesFromApi({
      peladaId: 'p1',
      playersPerTeam: 6,
      teamCount: 2,
      modality: 'campo',
      goalkeeperMode: 'ROTATING',
      fixedListOnly: false,
      drawWeights: {},
      extra: { customStyleTags: ['pé de anjo', 'capitão'] },
    });
    expect(form.customStyleTagsText).toBe('pé de anjo, capitão');
  });
});
