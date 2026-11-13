import {
  campoTimerDriftMs,
  catchUpTickMsOnPageVisible,
  shouldResyncFieldSessionOnVisible,
} from './campo-timer-visibility.logic';

describe('campo-timer-visibility.logic §3.6-TIMER', () => {
  it('catchUpTickMsOnPageVisible usa relógio atual', () => {
    const now = 9_999_999;
    expect(catchUpTickMsOnPageVisible(now)).toBe(now);
  });

  it('campoTimerDriftMs detecta atraso do tick com aba oculta', () => {
    const anchor = 1_000;
    const session = {
      elapsedMs: 60_000,
      timerRunning: true,
    };
    const frozenTick = anchor + 1_000;
    const now = anchor + 45_000;
    expect(campoTimerDriftMs(session, frozenTick, now, anchor)).toBe(44_000);
  });

  it('campoTimerDriftMs zero com cronômetro pausado', () => {
    const session = { elapsedMs: 10_000, timerRunning: false };
    expect(campoTimerDriftMs(session, 0, 50_000, 0)).toBe(0);
  });

  it('shouldResyncFieldSessionOnVisible', () => {
    expect(shouldResyncFieldSessionOnVisible(null)).toBe(false);
    expect(
      shouldResyncFieldSessionOnVisible({ finishedAt: '2026-01-01T00:00:00Z' }),
    ).toBe(false);
    expect(shouldResyncFieldSessionOnVisible({ finishedAt: null })).toBe(true);
  });
});
