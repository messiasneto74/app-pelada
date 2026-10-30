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

export function monthUtcBounds(reference: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1),
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
