import { shouldExposeProbeModule } from './app.module';

describe('shouldExposeProbeModule (Médio)', () => {
  it('exclui o ProbeModule em produção', () => {
    expect(shouldExposeProbeModule('production')).toBe(false);
  });

  it('inclui o ProbeModule fora de produção', () => {
    expect(shouldExposeProbeModule('development')).toBe(true);
    expect(shouldExposeProbeModule('test')).toBe(true);
    expect(shouldExposeProbeModule(undefined)).toBe(true);
  });
});
