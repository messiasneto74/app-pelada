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
});
