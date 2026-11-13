import { RESENHA_COLORS } from './resenha-tokens';
import {
  WCAG_AA_NORMAL_TEXT,
  contrastRatio,
} from './wcag-contrast';

describe('Resenha T1 — contraste (WCAG AA)', () => {
  const pairs: { label: string; fg: string; bg: string; min: number }[] = [
    { label: 'ink on bg', fg: RESENHA_COLORS.ink, bg: RESENHA_COLORS.bg, min: WCAG_AA_NORMAL_TEXT },
    { label: 'ink on paper', fg: RESENHA_COLORS.ink, bg: RESENHA_COLORS.paper, min: WCAG_AA_NORMAL_TEXT },
    { label: 'muted on bg', fg: RESENHA_COLORS.muted, bg: RESENHA_COLORS.bg, min: WCAG_AA_NORMAL_TEXT },
    { label: 'muted on paper', fg: RESENHA_COLORS.muted, bg: RESENHA_COLORS.paper, min: WCAG_AA_NORMAL_TEXT },
    { label: 'accent link on bg', fg: RESENHA_COLORS.accent, bg: RESENHA_COLORS.bg, min: WCAG_AA_NORMAL_TEXT },
    { label: 'error on paper', fg: RESENHA_COLORS.red, bg: RESENHA_COLORS.paper, min: WCAG_AA_NORMAL_TEXT },
    { label: 'primary label on green', fg: '#ffffff', bg: RESENHA_COLORS.green, min: WCAG_AA_NORMAL_TEXT },
    { label: 'green on lime CTA', fg: RESENHA_COLORS.green, bg: RESENHA_COLORS.lime, min: WCAG_AA_NORMAL_TEXT },
    {
      label: 'focus ring vs paper',
      fg: RESENHA_COLORS.focus,
      bg: RESENHA_COLORS.paper,
      min: WCAG_AA_NORMAL_TEXT,
    },
    {
      label: 'focus ring vs bg',
      fg: RESENHA_COLORS.focus,
      bg: RESENHA_COLORS.bg,
      min: WCAG_AA_NORMAL_TEXT,
    },
  ];

  pairs.forEach(({ label, fg, bg, min }) => {
    it(`${label} ≥ ${min}:1`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
    });
  });
});
