import {
  formatCashSummary,
  isPendingEntry,
  paymentStatusChipLabel,
  peladaPaymentModelLabel,
} from './caixa-view.logic';

describe('caixa-view.logic §3.9', () => {
  it('peladaPaymentModelLabel', () => {
    expect(peladaPaymentModelLabel('MONTHLY')).toBe('Mensal');
  });

  it('paymentStatusChipLabel', () => {
    expect(paymentStatusChipLabel('PAID')).toBe('Pago');
    expect(paymentStatusChipLabel('PENDING')).toBe('Devendo');
  });

  it('formatCashSummary', () => {
    const f = formatCashSummary(5000, 10000);
    expect(f.percent).toBe(50);
    expect(f.remainingLabel).toContain('50');
  });

  it('isPendingEntry', () => {
    expect(isPendingEntry({ status: 'PENDING' })).toBe(true);
    expect(isPendingEntry({ status: 'PAID' })).toBe(false);
  });
});
