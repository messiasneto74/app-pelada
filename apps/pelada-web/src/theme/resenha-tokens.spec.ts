import {
  RESENHA_COLORS,
  RESENHA_FONTS,
  RESENHA_RADIUS,
  RESENHA_SPACING,
  RESENHA_VIEWPORT,
} from './resenha-tokens';

describe('Resenha design tokens (T1)', () => {
  it('cores alinhadas ao protótipo', () => {
    expect(RESENHA_COLORS.green).toBe('#173d32');
    expect(RESENHA_COLORS.lime).toBe('#dcf58a');
    expect(RESENHA_COLORS.bg).toBe('#f5f6f3');
    expect(RESENHA_COLORS.ink).toBe('#202c27');
  });

  it('tipografia Barlow Condensed + DM Sans', () => {
    expect(RESENHA_FONTS.title).toContain('Barlow Condensed');
    expect(RESENHA_FONTS.body).toContain('DM Sans');
  });

  it('escala de espaçamento e raios', () => {
    expect(RESENHA_SPACING[4]).toBe('16px');
    expect(RESENHA_RADIUS.md).toBe('7px');
    expect(RESENHA_RADIUS.lg).toBe('10px');
  });

  it('viewport mobile de referência 390×844', () => {
    expect(RESENHA_VIEWPORT.width).toBe(390);
    expect(RESENHA_VIEWPORT.height).toBe(844);
  });
});
