import { L1_SCREEN_CHECKLIST } from './l1-screen-checklist';

describe('L1 screen checklist', () => {
  it('cobre campos da lacuna §4', () => {
    const ids = L1_SCREEN_CHECKLIST.map((i) => i.id);
    expect(ids).toContain('nome');
    expect(ids).toContain('foto');
    expect(ids).toContain('dia');
    expect(ids).toContain('local');
  });
});
