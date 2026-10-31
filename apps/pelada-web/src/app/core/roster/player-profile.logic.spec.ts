import {
  attributeBarPercent,
  canShowEditProfile,
  paymentPlanLabel,
} from './player-profile.logic';

describe('player profile logic (3.8)', () => {
  it('canShowEditProfile — organizador sempre vê editar', () => {
    expect(
      canShowEditProfile({
        isOrganizador: true,
        allowPlayerSelfEdit: false,
        playerUserId: null,
        currentAppUserId: null,
      }),
    ).toBe(true);
  });

  it('canShowEditProfile — jogador só com regra 27 e vínculo userId', () => {
    expect(
      canShowEditProfile({
        isOrganizador: false,
        allowPlayerSelfEdit: true,
        playerUserId: 'u1',
        currentAppUserId: 'u1',
      }),
    ).toBe(true);
    expect(
      canShowEditProfile({
        isOrganizador: false,
        allowPlayerSelfEdit: false,
        playerUserId: 'u1',
        currentAppUserId: 'u1',
      }),
    ).toBe(false);
  });

  it('attributeBarPercent mapeia 1–10 para barra 10–100', () => {
    expect(attributeBarPercent(8)).toBe(80);
    expect(attributeBarPercent(undefined)).toBe(50);
  });

  it('paymentPlanLabel', () => {
    expect(paymentPlanLabel('MONTHLY')).toBe('Mensalista');
    expect(paymentPlanLabel('PER_MATCH')).toBe('Por partida');
  });
});
