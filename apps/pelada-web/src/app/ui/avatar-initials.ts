/** Iniciais para avatar (1–2 letras), alinhado ao protótipo Resenha. */
export function avatarInitials(name: string, maxLetters = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, maxLetters).toUpperCase();
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.slice(0, maxLetters).toUpperCase();
}
