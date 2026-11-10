/** Cobrança WhatsApp + Pix (hist. 18) — fora do MVP (issue 3.9-ZAP). */
export const ZAP_CHARGE_ENABLED = false;

export type ZapChargeMvpPresentation = 'disabled' | 'hidden';

/** Spec §3.9: no MVP o botão pode aparecer desativado ou escondido. */
export const ZAP_CHARGE_MVP_PRESENTATION: ZapChargeMvpPresentation = 'disabled';

export const ZAP_CHARGE_BUTTON_LABEL = 'Cobrança Zap (em breve)';
export const ZAP_CHARGE_BUTTON_TITLE =
  'Cobrança pelo WhatsApp com Pix fica para depois do MVP (hist. 18).';

export function showZapChargeButton(isOrganizador: boolean): boolean {
  if (!isOrganizador) {
    return false;
  }
  if (ZAP_CHARGE_ENABLED) {
    return true;
  }
  return ZAP_CHARGE_MVP_PRESENTATION === 'disabled';
}

export function zapChargeButtonDisabled(): boolean {
  return !ZAP_CHARGE_ENABLED;
}
