import {
  applyTimerAction,
  capRoundClock,
  readRoundLimitMs,
  computeNextRoundSides,
  readRotationPolicy,
  snapshotElapsedMs,
  updateFixedGkMeta,
  wasRoundPlayed,
} from './match-field-rotation.logic';

describe('match-field-rotation.logic', () => {
  it('readRotationPolicy usa extra.rotationPolicy', () => {
    expect(
      readRotationPolicy({ rotationPolicy: 'REST_QUEUE' }),
    ).toBe('REST_QUEUE');
    expect(readRotationPolicy({})).toBe('WINNER_STAYS');
  });

  it('winnerStays roda fila com 3 times', () => {
    const next = computeNextRoundSides({
      policy: 'WINNER_STAYS',
      teamCount: 3,
      roundNumber: 1,
      homeTeamSortOrder: 0,
      awayTeamSortOrder: 1,
      scoreHome: 2,
      scoreAway: 0,
    });
    expect(next.homeTeamSortOrder).toBe(0);
    expect(next.awayTeamSortOrder).toBe(2);
    expect(next.roundNumber).toBe(2);
  });

  it('SEQUENTIAL avança pares A×B, B×C, C×A', () => {
    const r1 = computeNextRoundSides({
      policy: 'SEQUENTIAL',
      teamCount: 3,
      roundNumber: 1,
      homeTeamSortOrder: 0,
      awayTeamSortOrder: 1,
      scoreHome: 0,
      scoreAway: 0,
    });
    expect(r1).toEqual({
      homeTeamSortOrder: 1,
      awayTeamSortOrder: 2,
      roundNumber: 2,
    });
  });

  it('timer start/pause acumula elapsed', () => {
    const t0 = new Date('2030-01-01T00:00:00.000Z');
    const started = applyTimerAction(1000, null, 'start', t0);
    expect(started.timerRunningSince).toEqual(t0);
    const t1 = new Date('2030-01-01T00:00:05.000Z');
    expect(snapshotElapsedMs(1000, t0, t1)).toBe(6000);
    const paused = applyTimerAction(1000, t0, 'pause', t1);
    expect(paused.elapsedMs).toBe(6000);
    expect(paused.timerRunningSince).toBeNull();
  });

  it('updateFixedGkMeta move GK por resultado', () => {
    const meta = updateFixedGkMeta(
      {},
      {
        goalkeeperMode: 'FIXED_GLOBAL',
        fixedGkRotation: 'RESULT',
        homeTeamSortOrder: 0,
        awayTeamSortOrder: 1,
        scoreHome: 3,
        scoreAway: 1,
      },
    );
    expect(meta['gkTeamSortOrder']).toBe(0);
  });

  describe('wasRoundPlayed (issue #217)', () => {
    const base = { scoreHome: 0, scoreAway: 0, goalCount: 0, durationMs: 0, timerRunning: false };
    it('rodada sem gol e sem cronômetro não foi jogada', () => {
      expect(wasRoundPlayed(base)).toBe(false);
    });
    it('gol, tempo corrido ou cronômetro rodando contam como jogada', () => {
      expect(wasRoundPlayed({ ...base, scoreHome: 1, goalCount: 1 })).toBe(true);
      expect(wasRoundPlayed({ ...base, durationMs: 1500 })).toBe(true);
      expect(wasRoundPlayed({ ...base, timerRunning: true })).toBe(true);
    });
  });

  describe('cronômetro por rodada (issue #229)', () => {
    it('readRoundLimitMs usa extra.roundMinutes (1–120) ou 20 min', () => {
      expect(readRoundLimitMs({ roundMinutes: 10 })).toBe(600_000);
      expect(readRoundLimitMs({})).toBe(1_200_000);
      expect(readRoundLimitMs({ roundMinutes: 0 })).toBe(1_200_000);
      expect(readRoundLimitMs({ roundMinutes: 500 })).toBe(1_200_000);
      expect(readRoundLimitMs(null)).toBe(1_200_000);
    });

    it('capRoundClock: tempo da rodada a partir do início dela, parando no limite', () => {
      expect(capRoundClock(130_000, 100_000, 60_000)).toEqual({
        cumulativeMs: 130_000,
        roundElapsedMs: 30_000,
        timeUp: false,
      });
      expect(capRoundClock(200_000, 100_000, 60_000)).toEqual({
        cumulativeMs: 160_000,
        roundElapsedMs: 60_000,
        timeUp: true,
      });
    });
  });
});
