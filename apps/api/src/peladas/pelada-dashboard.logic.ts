import type { PeladaRules } from '@prisma/client';
import { mergeEffectiveMatchRules } from '../matches/match-rules.merge';

export type DashboardNextMatchJson = {
  id: string;
  scheduledAt: string;
  location: string | null;
  modality: string;
  confirmedCount: number;
  capacity: number;
  confirmedPlayers: { id: string; displayName: string }[];
};

export type PeladaDashboardResponse = {
  peladaId: string;
  nextMatch: DashboardNextMatchJson | null;
  rosterPlayerCount: number;
  cashMonth: {
    receivedCents: number;
    expectedCents: number;
  };
};

/** Capacidade ideal da partida (vagas) a partir das regras efetivas. */
export function computeMatchCapacity(
  rules: Pick<PeladaRules, 'capacity' | 'playersPerTeam' | 'teamCount'>,
): number {
  if (typeof rules.capacity === 'number' && rules.capacity > 0) {
    return rules.capacity;
  }
  return rules.playersPerTeam * rules.teamCount * 2;
}

/**
 * Brasil não observa horário de verão desde 2019: America/Sao_Paulo é
 * UTC-3 o ano inteiro, então um offset fixo é seguro aqui.
 */
const BR_TIMEZONE_OFFSET_MINUTES = -180;

/**
 * Início/fim do mês no fuso de Brasília, não em UTC — um pagamento feito
 * depois das 21h no último dia do mês (horário de Brasília) ainda cai no
 * mês correto (bug Médio da auditoria: `monthUtcBounds` usava UTC puro).
 */
export function monthUtcBounds(
  reference: Date,
  timezoneOffsetMinutes: number = BR_TIMEZONE_OFFSET_MINUTES,
): { start: Date; end: Date } {
  const offsetMs = timezoneOffsetMinutes * 60_000;
  const local = new Date(reference.getTime() + offsetMs);
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs,
  );
  const end = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - offsetMs,
  );
  return { start, end };
}

export function effectiveModalityForMatch(
  defaults: PeladaRules,
  rulesOverride: unknown,
): string {
  const effective = mergeEffectiveMatchRules(
    defaults,
    rulesOverride && typeof rulesOverride === 'object'
      ? (rulesOverride as Record<string, unknown>)
      : null,
  );
  return effective.modality;
}
