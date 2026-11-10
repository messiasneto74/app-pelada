import {
  applyTimerAction,
  computeNextRoundSides,
  readRotationPolicy,
  snapshotElapsedMs,
  updateFixedGkMeta,
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
});
