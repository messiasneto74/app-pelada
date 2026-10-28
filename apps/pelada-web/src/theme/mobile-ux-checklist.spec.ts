import {
  MOBILE_TOUCH_MIN_PX,
  MOBILE_UX_CHECKLIST,
  MOBILE_VIEWPORT,
} from './mobile-ux-checklist';

describe('Mobile UX checklist (T6 / história 84)', () => {
  it('viewport de referência 390×844', () => {
    expect(MOBILE_VIEWPORT.width).toBe(390);
    expect(MOBILE_VIEWPORT.height).toBe(844);
  });

  it('alvo de toque mínimo 44px', () => {
    expect(MOBILE_TOUCH_MIN_PX).toBe(44);
  });

  it('checklist inclui itens automatizados e manuais', () => {
    expect(MOBILE_UX_CHECKLIST.length).toBeGreaterThanOrEqual(4);
    expect(MOBILE_UX_CHECKLIST.some((i) => i.automated)).toBe(true);
    expect(MOBILE_UX_CHECKLIST.some((i) => !i.automated)).toBe(true);
  });
});
