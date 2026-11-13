import type { PlayerPaymentPlan } from '../roster/pelada-player-profile-api.model';

export type PaymentLedgerStatus = 'PENDING' | 'PAID' | 'WAIVED';

export type PeladaPaymentModel =
  | 'PER_MATCH'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY';

export type PaymentLedgerEntryDto = {
  id: string;
  playerId: string;
  playerName: string;
  playerPaymentPlan: PlayerPaymentPlan;
  matchId: string | null;
  matchScheduledAt: string | null;
  amountCents: number;
  status: PaymentLedgerStatus;
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

export type LedgerGroupBy = 'player' | 'match';
