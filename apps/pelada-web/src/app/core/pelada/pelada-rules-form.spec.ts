import {
  DEFAULT_PELADA_RULES,
  toGoalkeeperMode,
  toDrawWeights,
  validateGoalkeeperToggles,
  validatePeladaRulesForm,
} from './pelada-rules.model';

describe('pelada rules form (3.2)', () => {
  it('bloqueia goleiro por time e fixo ao mesmo tempo', () => {
    expect(
      validateGoalkeeperToggles(true, true),
    ).toContain('não podem ficar ligados');
  });

  it('aceita combinações válidas de goleiro', () => {
    expect(validateGoalkeeperToggles(false, false)).toBeNull();
    expect(validateGoalkeeperToggles(true, false)).toBeNull();
    expect(validateGoalkeeperToggles(false, true)).toBeNull();
  });

  it('mapeia modo de goleiro', () => {
    expect(toGoalkeeperMode({ goalkeeperPerTeam: false, fixedGoalkeeper: false })).toBe(
      'ROTATING',
    );
    expect(toGoalkeeperMode({ goalkeeperPerTeam: true, fixedGoalkeeper: false })).toBe(
      'FIXED_PER_TEAM',
    );
    expect(toGoalkeeperMode({ goalkeeperPerTeam: false, fixedGoalkeeper: true })).toBe(
      'FIXED_GLOBAL',
    );
  });

  it('inclui usar atributos nos defaults (spec §3.2)', () => {
    expect(DEFAULT_PELADA_RULES.drawUseAttributes).toBe(true);
  });

  it('mapeia drawWeights para API', () => {
    expect(
      toDrawWeights({
        drawMode: 'BALANCED',
        drawUseRating: true,
        drawUseAttributes: false,
        drawUseStyleTags: true,
      }),
    ).toEqual({
      mode: 'BALANCED',
      useRating: true,
      useAttributes: false,
      useStyleTags: true,
    });
  });

  it('valida limites de formato', () => {
    expect(
      validatePeladaRulesForm({ ...DEFAULT_PELADA_RULES, playersPerTeam: 3 }),
    ).toContain('4 e 11');
    expect(
      validatePeladaRulesForm({ ...DEFAULT_PELADA_RULES, teamCount: 7 }),
    ).toContain('2 e 6');
  });
});
