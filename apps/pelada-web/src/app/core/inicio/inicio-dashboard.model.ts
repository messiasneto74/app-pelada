/** Contrato alinhado a `GET /peladas/:id/dashboard` (issue 3.1-API). */
export type PeladaDashboardDto = {
  peladaId: string;
  nextMatch: NextMatchDto | null;
  rosterPlayerCount: number;
  cashMonth: {
    receivedCents: number;
    expectedCents: number;
  };
};

export type NextMatchDto = {
  id: string;
  scheduledAt: string;
  location: string | null;
  modality: string;
  confirmedCount: number;
  capacity: number;
  confirmedPlayers: { id: string; displayName: string }[];
};

export type InicioDashboardView = {
  peladaName: string;
  nextMatch: {
    matchId: string;
    dateLabel: string;
    timeLabel: string;
    locationLabel: string;
    modalityLabel: string;
    confirmedCount: number;
    capacity: number;
    vacancyPercent: number;
    confirmedPlayers: { id: string; displayName: string }[];
    presenceLink: string;
  } | null;
  rosterPlayerCount: number;
  cashReceivedLabel: string;
  cashExpectedLabel: string;
  cashPercent: number;
};

export const INICIO_SHORTCUTS = [
  { id: 'create', label: 'Criar partida', route: '/inicio/criar-partida' },
  { id: 'rules', label: 'Regras', route: '/inicio/regras' },
  { id: 'roster', label: 'Elenco', route: '/jogadores' },
  { id: 'cash', label: 'Cobrar', route: '/caixa' },
] as const;

const MODALITY_LABELS: Record<string, string> = {
  futsal: 'Futsal',
  society: 'Society',
  campo: 'Campo',
};

export function modalityLabel(modality: string): string {
  return MODALITY_LABELS[modality] ?? modality;
}

export function formatMoneyBrl(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function vacancyFillPercent(confirmed: number, capacity: number): number {
  if (capacity <= 0) {
    return 0;
  }
  const ratio = confirmed / capacity;
  if (ratio < 0) {
    return 0;
  }
  if (ratio > 1) {
    return 100;
  }
  return Math.round(ratio * 100);
}

export function cashSummaryPercent(receivedCents: number, expectedCents: number): number {
  if (expectedCents <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((receivedCents / expectedCents) * 100));
}

export function formatMatchDateParts(iso: string): { dateLabel: string; timeLabel: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateLabel: 'Data a definir', timeLabel: '' };
  }
  const dateLabel = d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const timeLabel = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { dateLabel, timeLabel };
}
