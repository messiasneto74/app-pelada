import {
  displayElapsedMs,
  formatTimerLabel,
  rotationPolicyLabel,
} from './campo-view.logic';

describe('campo-view.logic §3.6', () => {
  it('rotationPolicyLabel', () => {
    expect(rotationPolicyLabel('WINNER_STAYS')).toBe('Ganha fica');
  });

  it('formatTimerLabel', () => {
    expect(formatTimerLabel(125000)).toBe('02:05');
  });

  it('displayElapsedMs soma tempo com cronômetro rodando', () => {
    const since = new Date('2030-01-01T00:00:00.000Z').toISOString();
    const elapsed = displayElapsedMs(
      {
        elapsedMs: 10_000,
        timerRunning: true,
        timerRunningSince: since,
      },
      new Date('2030-01-01T00:00:07.000Z').getTime(),
    );
    expect(elapsed).toBe(17_000);
  });
});
