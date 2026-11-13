import {
  ZAP_CHARGE_BUTTON_LABEL,
  ZAP_CHARGE_ENABLED,
  ZAP_CHARGE_MVP_PRESENTATION,
  showZapChargeButton,
  zapChargeButtonDisabled,
} from './caixa-zap-charge.policy';

describe('caixa-zap-charge.policy §3.9-ZAP', () => {
  it('MVP mantém cobrança Zap desligada', () => {
    expect(ZAP_CHARGE_ENABLED).toBe(false);
    expect(ZAP_CHARGE_MVP_PRESENTATION).toBe('disabled');
    expect(zapChargeButtonDisabled()).toBe(true);
  });

  it('showZapChargeButton', () => {
    expect(showZapChargeButton(false)).toBe(false);
    expect(showZapChargeButton(true)).toBe(true);
  });

  it('rótulo do stub MVP', () => {
    expect(ZAP_CHARGE_BUTTON_LABEL).toContain('Cobrança Zap');
  });
});
