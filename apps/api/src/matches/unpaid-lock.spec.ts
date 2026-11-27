import { openChargeMessage, readUnpaidPolicy } from './unpaid-lock';

describe('Issue #263 — quem não pagou', () => {
  it('padrão é só cobrar; "BLOCK" trava', () => {
    expect(readUnpaidPolicy({ unpaidPolicy: 'BLOCK' })).toBe('BLOCK');
    expect(readUnpaidPolicy({ unpaidPolicy: 'CHARGE' })).toBe('CHARGE');
    expect(readUnpaidPolicy({})).toBe('CHARGE');
    expect(readUnpaidPolicy(null)).toBe('CHARGE');
  });

  it('mensagem clara', () => {
    expect(openChargeMessage('Ana')).toBe(
      'Ana tem cobrança em aberto. Só entra na lista depois que o adm confirmar o pagamento no Caixa.',
    );
  });
});
