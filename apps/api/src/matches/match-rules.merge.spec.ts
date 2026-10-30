import { mergeEffectiveMatchRules } from './match-rules.merge';

describe('match-rules.merge', () => {
  const defaults = {
    peladaId: 'p1',
    playersPerTeam: 6,
    teamCount: 2,
    modality: 'campo',
    goalkeeperMode: 'ROTATING' as const,
    presenceMode: 'ORGANIZER_CLOSES' as const,
    capacity: null,
    allowPlayerSelfEdit: false,
    fixedListOnly: false,
    drawWeights: { mode: 'BALANCED' },
    extra: {},
    id: 'r1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('aplica override sem alterar defaults no objeto base', () => {
    const effective = mergeEffectiveMatchRules(defaults, {
      playersPerTeam: 7,
    });
    expect(effective.playersPerTeam).toBe(7);
    expect(defaults.playersPerTeam).toBe(6);
  });

  it('rejeita override GK conflitante no effective', () => {
    expect(() =>
      mergeEffectiveMatchRules(defaults, {
        extra: { goalkeeperPerTeam: true, fixedGoalkeeper: true },
      }),
    ).toThrow();
  });
});
