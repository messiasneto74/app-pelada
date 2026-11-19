/** Lê o limiar de presenças pra promoção automática de Convidado (issue #179). */
export function readAutoPromoteThresholdFromRules(extra: unknown): number | null {
  const bag =
    extra && typeof extra === 'object' ? (extra as Record<string, unknown>) : {};
  const raw = bag['autoPromoteAfterPresences'];
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  return null;
}

/** 0/ausente desativa a regra — ver `readAutoPromoteThresholdFromRules`. */
export function shouldAutoPromoteGuest(
  confirmedPresenceCount: number,
  threshold: number | null,
): boolean {
  if (threshold === null) {
    return false;
  }
  return confirmedPresenceCount >= threshold;
}
