import {
  buildFormatRulesInput,
  evaluateFormatBeforeClose,
} from './presence-format-suggest.logic';

describe('presence-format-suggest.logic', () => {
  it('usa capacity explícita quando difere da fórmula padrão', () => {
    expect(
      buildFormatRulesInput({ playersPerTeam: 6, teamCount: 2 }, 14),
    ).toEqual({
      playersPerTeam: 6,
      teamCount: 2,
      capacity: 14,
    });
  });

  it('detecta mismatch antes de fechar lista', () => {
    const result = evaluateFormatBeforeClose(
      10,
      { playersPerTeam: 6, teamCount: 2 },
      14,
    );
    expect(result.mismatch).toBe(true);
    expect(result.options.length).toBeGreaterThan(0);
  });

  it('não alerta quando confirmados batem capacidade ideal', () => {
    const result = evaluateFormatBeforeClose(
      14,
      { playersPerTeam: 6, teamCount: 2 },
      14,
    );
    expect(result.mismatch).toBe(false);
  });
});
