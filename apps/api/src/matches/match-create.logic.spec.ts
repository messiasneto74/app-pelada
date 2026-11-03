import type { PeladaRules } from '@prisma/client';
import {
  buildInitialMatchRulesOverride,
  peladaRulesToMatchSnapshot,
} from './match-create.logic';

const sampleRules = {
  id: 'r1',
  peladaId: 'p1',
  playersPerTeam: 6,
  teamCount: 2,
  modality: 'futsal',
  goalkeeperMode: 'ROTATING',
  presenceMode: 'ORGANIZER_CLOSES',
  capacity: 14,
  allowPlayerSelfEdit: false,
  fixedListOnly: false,
  drawWeights: { mode: 'BALANCED' },
  extra: { gkPerTeam: true },
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies PeladaRules;

describe('match-create.logic (3.3-API)', () => {
  it('peladaRulesToMatchSnapshot congela campos das regras', () => {
    const snap = peladaRulesToMatchSnapshot(sampleRules);
    expect(snap.playersPerTeam).toBe(6);
    expect(snap.teamCount).toBe(2);
    expect(snap.rulesSnapshotAt).toBeDefined();
  });

  it('buildInitialMatchRulesOverride mescla exceção opcional do DTO', () => {
    const merged = buildInitialMatchRulesOverride(sampleRules, {
      playersPerTeam: 5,
    });
    expect(merged.playersPerTeam).toBe(5);
    expect(merged.teamCount).toBe(2);
  });
});
