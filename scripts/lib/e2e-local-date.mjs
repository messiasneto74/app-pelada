/** YYYY-MM-DD no fuso local (evita UTC em `toISOString()` no fluxo E2E). */
export function formatLocalDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function tomorrowLocalDateInput(from = new Date()) {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  return formatLocalDateInput(next);
}
