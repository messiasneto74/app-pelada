import {
  groupLedgerEntries,
  periodBoundsForPaymentModel,
  readFeeCentsFromRules,
  readPaymentModelFromRules,
  summarizeLedgerAmounts,
} from './payment-ledger.logic';

describe('payment-ledger.logic §3.9-API', () => {
  it('readPaymentModelFromRules e fee', () => {
    expect(readPaymentModelFromRules({ paymentModel: 'WEEKLY' })).toBe('WEEKLY');
    expect(readPaymentModelFromRules(null)).toBe('PER_MATCH');
    expect(readFeeCentsFromRules({ feeCents: 2500 })).toBe(2500);
    expect(readFeeCentsFromRules({ matchFeeCents: 1800 })).toBe(1800);
  });

  it('periodBoundsForPaymentModel mensal (fuso de Brasília, UTC-3)', () => {
    const ref = new Date('2026-03-15T12:00:00.000Z');
    const { start, end } = periodBoundsForPaymentModel('MONTHLY', ref);
    expect(start.toISOString()).toBe('2026-03-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-01T03:00:00.000Z');
  });

  it('summarizeLedgerAmounts', () => {
    const s = summarizeLedgerAmounts([
      { amountCents: 1000, status: 'PAID' },
      { amountCents: 500, status: 'PENDING' },
      { amountCents: 200, status: 'WAIVED' },
    ]);
    expect(s).toEqual({
      receivedCents: 1000,
      expectedCents: 1500,
      pendingCents: 500,
    });
  });

  it('groupLedgerEntries por jogador', () => {
    const groups = groupLedgerEntries(
      [
        {
          id: '1',
          playerId: 'p1',
          playerName: 'Ana',
          playerPaymentPlan: 'PER_MATCH',
          matchId: 'm1',
          matchScheduledAt: '2026-01-10T19:00:00.000Z',
          amountCents: 100,
          status: 'PENDING',
          paidAt: null,
        },
        {
          id: '2',
          playerId: 'p1',
          playerName: 'Ana',
          playerPaymentPlan: 'PER_MATCH',
          matchId: 'm2',
          matchScheduledAt: '2026-01-17T19:00:00.000Z',
          amountCents: 100,
          status: 'PAID',
          paidAt: '2026-01-18T00:00:00.000Z',
        },
      ],
      'player',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].receivedCents).toBe(100);
    expect(groups[0].expectedCents).toBe(200);
    expect(groups[0].entries).toHaveLength(2);
  });
});
