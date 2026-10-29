import { BadRequestException } from '@nestjs/common';
import { assertGoalkeeperExclusive } from './pelada-rules.validation';

describe('pelada-rules.validation', () => {
  it('rejeita extra com os dois flags GK', () => {
    expect(() =>
      assertGoalkeeperExclusive(undefined, {
        goalkeeperPerTeam: true,
        fixedGoalkeeper: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita FIXED_PER_TEAM com fixedGoalkeeper no extra', () => {
    expect(() =>
      assertGoalkeeperExclusive('FIXED_PER_TEAM', { fixedGoalkeeper: true }),
    ).toThrow(BadRequestException);
  });

  it('aceita ROTATING sem flags conflitantes', () => {
    expect(() =>
      assertGoalkeeperExclusive('ROTATING', { goalkeeperPerTeam: false }),
    ).not.toThrow();
  });
});
