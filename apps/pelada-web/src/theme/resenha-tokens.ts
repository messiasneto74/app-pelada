/**
 * Design tokens Resenha (T1) — espelham :root em resenha-tokens.scss.
 * Fonte visual: prototipo/styles.css · docs/ui-referencia-resenha.md
 */
export const RESENHA_COLORS = {
  bg: '#f5f6f3',
  paper: '#ffffff',
  ink: '#202c27',
  muted: '#7b847e',
  green: '#173d32',
  lime: '#dcf58a',
  line: '#e7eae4',
  accent: '#6b8a45',
  red: '#b94848',
  focus: '#92b936',
} as const;

export const RESENHA_FONTS = {
  title: '"Barlow Condensed", system-ui, sans-serif',
  body: '"DM Sans", system-ui, sans-serif',
} as const;

export const RESENHA_SPACING = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
} as const;

export const RESENHA_RADIUS = {
  sm: '5px',
  md: '7px',
  lg: '10px',
  xl: '12px',
  pill: '999px',
} as const;

export const RESENHA_VIEWPORT = {
  width: 390,
  height: 844,
} as const;
