import type { PaymentLedger, PaymentPlan, PaymentStatus, Player } from '@prisma/client';
import { monthUtcBounds } from './pelada-dashboard.logic';

export type PeladaPaymentModel = 'PER_MATCH' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type LedgerGroupBy = 'player' | 'match';

export type PaymentLedgerEntryDto = {
  id: string;
  playerId: string;
  playerName: string;
  playerPaymentPlan: PaymentPlan;
  matchId: string | null;
  matchScheduledAt: string | null;
  amountCents: number;
  status: PaymentStatus;
  paidAt: string | null;
};

export type PaymentLedgerGroupDto = {
  key: string;
  label: string;
  receivedCents: number;
  expectedCents: number;
  entries: PaymentLedgerEntryDto[];
};

export type PaymentLedgerResponse = {
  peladaId: string;
  paymentModel: PeladaPaymentModel;
  feeCents: number;
  periodStart: string;
  periodEnd: string;
  summary: {
    receivedCents: number;
    expectedCents: number;
    pendingCents: number;
  };
  groups: PaymentLedgerGroupDto[];
};

export function readPaymentModelFromRules(extra: unknown): PeladaPaymentModel {
  const bag =
    extra && typeof extra === 'object'
      ? (extra as Record<string, unknown>)
      : {};
  const v = bag['paymentModel'];
  if (
    v === 'PER_MATCH' ||
    v === 'WEEKLY' ||
    v === 'BIWEEKLY' ||
    v === 'MONTHLY'
  ) {
    return v;
  }
  return 'PER_MATCH';
}

export function readFeeCentsFromRules(extra: unknown): number {
  const bag =
    extra && typeof extra === 'object'
      ? (extra as Record<string, unknown>)
      : {};
  const raw = bag['feeCents'] ?? bag['matchFeeCents'];
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  return 0;
}

export function periodBoundsForPaymentModel(
  model: PeladaPaymentModel,
  reference: Date,
): { start: Date; end: Date } {
  if (model === 'MONTHLY' || model === 'PER_MATCH') {
    return monthUtcBounds(reference);
  }
  if (model === 'WEEKLY') {
    const day = reference.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate() - diffToMonday,
      ),
    );
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const d = reference.getUTCDate();
  if (d < 15) {
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m, 15)),
    };
  }
  return {
    start: new Date(Date.UTC(y, m, 15)),
    end: new Date(Date.UTC(y, m + 1, 1)),
  };
}

export function summarizeLedgerAmounts(
  rows: Pick<PaymentLedger, 'amountCents' | 'status'>[],
): {
  receivedCents: number;
  expectedCents: number;
  pendingCents: number;
} {
  let receivedCents = 0;
  let expectedCents = 0;
  let pendingCents = 0;
  for (const row of rows) {
    if (row.status === 'PAID') {
      receivedCents += row.amountCents;
    }
    if (row.status === 'PENDING' || row.status === 'PAID') {
      expectedCents += row.amountCents;
    }
    if (row.status === 'PENDING') {
      pendingCents += row.amountCents;
    }
  }
  return { receivedCents, expectedCents, pendingCents };
}

type RowWithRelations = PaymentLedger & {
  player: Pick<Player, 'id' | 'displayName' | 'paymentPlan'>;
  match: { id: string; scheduledAt: Date } | null;
};

export function toLedgerEntryDto(row: RowWithRelations): PaymentLedgerEntryDto {
  return {
    id: row.id,
    playerId: row.playerId,
    playerName: row.player.displayName,
    playerPaymentPlan: row.player.paymentPlan,
    matchId: row.matchId,
    matchScheduledAt: row.match?.scheduledAt.toISOString() ?? null,
    amountCents: row.amountCents,
    status: row.status,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export function groupLedgerEntries(
  entries: PaymentLedgerEntryDto[],
  groupBy: LedgerGroupBy,
): PaymentLedgerGroupDto[] {
  const map = new Map<string, PaymentLedgerGroupDto>();

  for (const e of entries) {
    const key =
      groupBy === 'player'
        ? e.playerId
        : (e.matchId ?? `no-match-${e.playerId}`);
    const label =
      groupBy === 'player'
        ? e.playerName
        : e.matchScheduledAt
          ? formatMatchLabel(e.matchScheduledAt)
          : 'Sem partida';

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        label,
        receivedCents: 0,
        expectedCents: 0,
        entries: [],
      };
      map.set(key, group);
    }
    group.entries.push(e);
    if (e.status === 'PAID') {
      group.receivedCents += e.amountCents;
    }
    if (e.status === 'PENDING' || e.status === 'PAID') {
      group.expectedCents += e.amountCents;
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt'));
}

function formatMatchLabel(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `Partida ${dd}/${mm}`;
}
