import { contrastRatio, parseHexColor } from './wcag-contrast';

describe('wcag-contrast', () => {
  it('parseia hex de 6 dígitos', () => {
    expect(parseHexColor('#202c27')).toEqual([32, 44, 39]);
  });

  it('calcula preto/branco ≈ 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThan(20.9);
    expect(contrastRatio('#000000', '#ffffff')).toBeLessThan(21.1);
  });
});
