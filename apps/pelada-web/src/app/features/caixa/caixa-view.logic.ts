import type { PeladaPaymentModel, PaymentLedgerEntryDto } from '../../core/payments/payment-ledger-api.model';
import { cashSummaryPercent, formatMoneyBrl } from '../../core/inicio/inicio-dashboard.model';

export function peladaPaymentModelLabel(model: PeladaPaymentModel): string {
  switch (model) {
    case 'WEEKLY':
      return 'Semanal';
    case 'BIWEEKLY':
      return 'Quinzenal';
    case 'MONTHLY':
      return 'Mensal';
    case 'PER_MATCH':
    default:
      return 'Por partida';
  }
}

export function paymentStatusChipLabel(
  status: PaymentLedgerEntryDto['status'],
): string {
  switch (status) {
    case 'PAID':
      return 'Pago';
    case 'WAIVED':
      return 'Isento';
    case 'PENDING':
    default:
      return 'Devendo';
  }
}

export function isPendingEntry(entry: Pick<PaymentLedgerEntryDto, 'status'>): boolean {
  return entry.status === 'PENDING';
}

export function formatCashSummary(
  receivedCents: number,
  expectedCents: number,
): {
  receivedLabel: string;
  expectedLabel: string;
  percent: number;
  remainingLabel: string;
} {
  const remaining = Math.max(0, expectedCents - receivedCents);
  return {
    receivedLabel: formatMoneyBrl(receivedCents),
    expectedLabel: formatMoneyBrl(expectedCents),
    percent: cashSummaryPercent(receivedCents, expectedCents),
    remainingLabel: formatMoneyBrl(remaining),
  };
}

export function entryContextLabel(
  entry: Pick<PaymentLedgerEntryDto, 'matchScheduledAt' | 'matchId'>,
): string | null {
  if (!entry.matchId || !entry.matchScheduledAt) {
    return null;
  }
  const d = new Date(entry.matchScheduledAt);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
