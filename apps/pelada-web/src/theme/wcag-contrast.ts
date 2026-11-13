/** WCAG 2.x relative luminance contrast ratio (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio). */

export function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, '');
  if (normalized.length !== 6 && normalized.length !== 8) {
    throw new Error(`Cor hex inválida: ${hex}`);
  }
  const rgb = normalized.slice(0, 6);
  return [
    Number.parseInt(rgb.slice(0, 2), 16),
    Number.parseInt(rgb.slice(2, 4), 16),
    Number.parseInt(rgb.slice(4, 6), 16),
  ];
}

function channelLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexColor(hex).map(channelLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG 2.1 AA — texto normal. */
export const WCAG_AA_NORMAL_TEXT = 4.5;

/** WCAG 2.1 AA — texto grande ou UI não textual forte. */
export const WCAG_AA_LARGE_TEXT = 3;
