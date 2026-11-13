import { PRESENCA_SCREEN_CHECKLIST } from './presenca-screen-checklist';

describe('Presença screen checklist §3.4', () => {
  it('cobre elementos da spec', () => {
    const ids = PRESENCA_SCREEN_CHECKLIST.map((i) => i.id);
    expect(ids).toContain('vacancy');
    expect(ids).toContain('guest');
    expect(ids).toContain('close');
  });
});
