import {
  computeNextRoundSides,
  readTieBreakRule,
  resolveTie,
  roundOutcome,
  updateFixedGkMeta,
} from './match-field-rotation.logic';

describe('Issue #227 — critério de desempate', () => {
  const tie = { scoreHome: 1, scoreAway: 1 };

  it('lê a regra; sem escolha nas Regras o empate continua empate (como antes)', () => {
    expect(readTieBreakRule({ tieBreak: 'PENALTIS' })).toBe('PENALTIS');
    expect(readTieBreakRule({ tieBreak: 'STAYED' })).toBe('STAYED');
    expect(readTieBreakRule({ tieBreak: 'PAR_IMPAR' })).toBe('PAR_IMPAR');
    expect(readTieBreakRule({ tieBreak: 'LAST_IN' })).toBe('LAST_IN');
    expect(readTieBreakRule({})).toBeNull();
    expect(readTieBreakRule(null)).toBeNull();
    expect(resolveTie({ rule: null, roundNumber: 1, ...tie })).toEqual({ kind: 'no-tie' });
  });

  it('sem empate não há desempate', () => {
    expect(resolveTie({ rule: 'PAR_IMPAR', roundNumber: 3, scoreHome: 2, scoreAway: 1 })).toEqual({ kind: 'no-tie' });
  });

  it('par ou ímpar / pênaltis: o adm escolhe sempre', () => {
    expect(resolveTie({ rule: 'PAR_IMPAR', roundNumber: 4, ...tie })).toEqual({ kind: 'need-choice', methods: ['PAR_IMPAR'] });
    expect(resolveTie({ rule: 'PENALTIS', roundNumber: 4, ...tie, chosen: { winner: 'HOME' } })).toEqual({
      kind: 'decided',
      winner: 'HOME',
      method: 'PENALTIS',
    });
  });

  it('quem entrou por último / quem já estava: automático a partir da 2ª rodada', () => {
    expect(resolveTie({ rule: 'LAST_IN', roundNumber: 2, ...tie })).toEqual({ kind: 'decided', winner: 'AWAY', method: 'LAST_IN' });
    expect(resolveTie({ rule: 'STAYED', roundNumber: 2, ...tie })).toEqual({ kind: 'decided', winner: 'HOME', method: 'STAYED' });
  });

  it('1ª rodada: ninguém "já estava" — adm decide no par ou ímpar ou nos pênaltis', () => {
    expect(resolveTie({ rule: 'STAYED', roundNumber: 1, ...tie })).toEqual({
      kind: 'need-choice',
      methods: ['PAR_IMPAR', 'PENALTIS'],
    });
    expect(resolveTie({ rule: 'LAST_IN', roundNumber: 1, ...tie, chosen: { winner: 'AWAY', method: 'PENALTIS' } })).toEqual({
      kind: 'decided',
      winner: 'AWAY',
      method: 'PENALTIS',
    });
  });

  it('com 2 times, "quem já estava" é quem ganhou a anterior (mesmo jogando de visitante)', () => {
    expect(resolveTie({ rule: 'STAYED', roundNumber: 2, ...tie, previousWinnerSide: 'AWAY' })).toEqual({
      kind: 'decided',
      winner: 'AWAY',
      method: 'STAYED',
    });
    expect(resolveTie({ rule: 'LAST_IN', roundNumber: 2, ...tie, previousWinnerSide: 'AWAY' })).toEqual({
      kind: 'decided',
      winner: 'HOME',
      method: 'LAST_IN',
    });
  });

  it('vencedor do desempate conta como vitória; rodada antiga sem desempate segue empate', () => {
    expect(roundOutcome({ ...tie, tieWinner: 'HOME' })).toBe('HOME');
    expect(roundOutcome({ ...tie, tieWinner: null })).toBe('DRAW');
    expect(roundOutcome({ scoreHome: 0, scoreAway: 2, tieWinner: 'HOME' })).toBe('AWAY');
  });

  it('o vencedor do desempate fica em campo (vencedor fica, 3 times)', () => {
    const base = {
      policy: 'WINNER_STAYS' as const,
      teamCount: 3,
      roundNumber: 2,
      homeTeamSortOrder: 0,
      awayTeamSortOrder: 1,
      ...tie,
    };
    expect(computeNextRoundSides({ ...base, tieWinnerSortOrder: 0 }).homeTeamSortOrder).toBe(0);
    expect(computeNextRoundSides({ ...base, tieWinnerSortOrder: 1 }).homeTeamSortOrder).toBe(1);
    expect(computeNextRoundSides(base).homeTeamSortOrder).toBe(1); // sem escolha: como antes
  });

  it('goleiro fixo por resultado acompanha o vencedor do desempate', () => {
    const meta = updateFixedGkMeta(
      {},
      {
        goalkeeperMode: 'FIXED_GLOBAL',
        fixedGkRotation: 'RESULT',
        homeTeamSortOrder: 0,
        awayTeamSortOrder: 2,
        ...tie,
        tieWinnerSortOrder: 2,
      },
    );
    expect(meta['gkTeamSortOrder']).toBe(2);
  });
});
