import {
  displayElapsedMs,
  displayRoundMs,
  formatTimerLabel,
  goalScorerOptions,
  rotationPolicyLabel,
} from './campo-view.logic';
import type { MatchFieldSessionDto } from '../../core/match/match-field-session-api.model';

describe('campo-view.logic §3.6', () => {
  it('rotationPolicyLabel', () => {
    expect(rotationPolicyLabel('WINNER_STAYS')).toBe('Ganha fica');
  });

  it('formatTimerLabel', () => {
    expect(formatTimerLabel(125000)).toBe('02:05');
  });

  it('displayElapsedMs com DTO já snapshotted (regressão 3.6)', () => {
    const anchor = Date.parse('2030-01-01T00:05:00.000Z');
    const fiveMinMs = 5 * 60 * 1000;
    const dto = {
      elapsedMs: fiveMinMs,
      timerRunning: true,
      timerRunningSince: '2030-01-01T00:00:00.000Z',
    };
    expect(displayElapsedMs(dto, anchor, anchor)).toBe(fiveMinMs);
    const plus3s = anchor + 3000;
    expect(displayElapsedMs(dto, plus3s, anchor)).toBe(fiveMinMs + 3000);
  });

  it('displayElapsedMs pausado usa elapsedMs sem anchor', () => {
    const dto = { elapsedMs: 42_000, timerRunning: false };
    expect(
      displayElapsedMs(dto, Date.now(), Date.now()),
    ).toBe(42_000);
  });

  describe('goalScorerOptions (issue #214)', () => {
    const session = {
      teamsOnField: [
        { sortOrder: 0, drawTeamId: 't0', name: 'Time A', role: 'HOME' },
        { sortOrder: 1, drawTeamId: 't1', name: 'Time B', role: 'AWAY' },
      ],
    } as unknown as MatchFieldSessionDto;
    const teams = [
      { id: 't0', playerIds: ['p2', 'p1'] },
      { id: 't1', playerIds: ['p3'] },
    ];
    const names = new Map([
      ['p1', 'Zé'],
      ['p2', 'Ana'],
      ['p3', 'Bia'],
    ]);

    it('lista só os jogadores do time que marcou, em ordem alfabética', () => {
      expect(goalScorerOptions(session, 'HOME', teams, names)).toEqual([
        { playerId: 'p2', name: 'Ana' },
        { playerId: 'p1', name: 'Zé' },
      ]);
      expect(goalScorerOptions(session, 'AWAY', teams, names)).toEqual([
        { playerId: 'p3', name: 'Bia' },
      ]);
    });

    it('sem sorteio carregado não lista ninguém', () => {
      expect(goalScorerOptions(session, 'HOME', [], names)).toEqual([]);
    });

    it('jogador fora do elenco carregado aparece como "Jogador"', () => {
      expect(goalScorerOptions(session, 'AWAY', teams, new Map())).toEqual([
        { playerId: 'p3', name: 'Jogador' },
      ]);
    });
  });

  describe('displayRoundMs (issue #229)', () => {
    const base = { elapsedMs: 500_000, roundElapsedMs: 30_000, roundLimitMs: 60_000, timerRunning: true, timeUp: false };
    it('mostra o tempo da rodada e anda com o cronômetro', () => {
      expect(displayRoundMs(base, 10_000, 0)).toBe(40_000);
    });
    it('para no tempo da rodada', () => {
      expect(displayRoundMs(base, 90_000, 0)).toBe(60_000);
      expect(displayRoundMs({ ...base, timeUp: true }, 0, 0)).toBe(60_000);
    });
    it('pausado não anda; sem dado novo da API usa o relógio antigo', () => {
      expect(displayRoundMs({ ...base, timerRunning: false }, 10_000, 0)).toBe(30_000);
      expect(displayRoundMs({ elapsedMs: 5_000, timerRunning: false }, 0, 0)).toBe(5_000);
    });
  });
});
