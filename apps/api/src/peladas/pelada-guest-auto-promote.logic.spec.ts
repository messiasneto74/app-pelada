import {
  readAutoPromoteThresholdFromRules,
  shouldAutoPromoteGuest,
} from './pelada-guest-auto-promote.logic';

describe('pelada-guest-auto-promote.logic (issue #179)', () => {
  describe('readAutoPromoteThresholdFromRules', () => {
    it('lê um número positivo de extra.autoPromoteAfterPresences', () => {
      expect(
        readAutoPromoteThresholdFromRules({ autoPromoteAfterPresences: 3 }),
      ).toBe(3);
    });

    it('trunca valores fracionários', () => {
      expect(
        readAutoPromoteThresholdFromRules({ autoPromoteAfterPresences: 3.9 }),
      ).toBe(3);
    });

    it('retorna null quando ausente, zero, negativo ou não numérico', () => {
      expect(readAutoPromoteThresholdFromRules({})).toBeNull();
      expect(readAutoPromoteThresholdFromRules(null)).toBeNull();
      expect(
        readAutoPromoteThresholdFromRules({ autoPromoteAfterPresences: 0 }),
      ).toBeNull();
      expect(
        readAutoPromoteThresholdFromRules({ autoPromoteAfterPresences: -2 }),
      ).toBeNull();
      expect(
        readAutoPromoteThresholdFromRules({ autoPromoteAfterPresences: 'x' }),
      ).toBeNull();
    });
  });

  describe('shouldAutoPromoteGuest', () => {
    it('promove quando a contagem atinge ou passa o limiar', () => {
      expect(shouldAutoPromoteGuest(3, 3)).toBe(true);
      expect(shouldAutoPromoteGuest(5, 3)).toBe(true);
    });

    it('não promove abaixo do limiar', () => {
      expect(shouldAutoPromoteGuest(2, 3)).toBe(false);
    });

    it('nunca promove com regra desativada (threshold null)', () => {
      expect(shouldAutoPromoteGuest(100, null)).toBe(false);
    });
  });
});
