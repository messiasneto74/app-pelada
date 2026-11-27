import { readTieBreakRule, TIE_BREAK_OPTIONS, tieChoiceMethods } from './tie-break.logic';

describe('Issue #227 — desempate (app)', () => {
  const tie = { scoreHome: 2, scoreAway: 2 };

  it('4 opções nas Regras', () => {
    expect(TIE_BREAK_OPTIONS.map((o) => o.label)).toEqual([
      'Par ou ímpar',
      'Pênaltis',
      'Quem entrou por último',
      'Quem já estava',
    ]);
  });

  it('lê a regra salva; sem regra = null', () => {
    expect(readTieBreakRule('PENALTIS')).toBe('PENALTIS');
    expect(readTieBreakRule(undefined)).toBeNull();
    expect(readTieBreakRule('x')).toBeNull();
  });

  it('quando o adm precisa escolher quem venceu', () => {
    expect(tieChoiceMethods({ rule: 'PAR_IMPAR', roundNumber: 5, ...tie })).toEqual(['PAR_IMPAR']);
    expect(tieChoiceMethods({ rule: 'PENALTIS', roundNumber: 5, ...tie })).toEqual(['PENALTIS']);
    expect(tieChoiceMethods({ rule: 'STAYED', roundNumber: 1, ...tie })).toEqual(['PAR_IMPAR', 'PENALTIS']);
    expect(tieChoiceMethods({ rule: 'LAST_IN', roundNumber: 2, ...tie })).toEqual([]);
    expect(tieChoiceMethods({ rule: 'PAR_IMPAR', roundNumber: 1, scoreHome: 1, scoreAway: 0 })).toEqual([]);
    expect(tieChoiceMethods({ rule: null, roundNumber: 1, ...tie })).toEqual([]);
  });
});
