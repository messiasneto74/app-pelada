import { BadRequestException } from '@nestjs/common';
import type { Player } from '@prisma/client';
import {
  assertFixedListAllowed,
  canPatchPlayerProfile,
  normalizePlayerAttributes,
  resolveIsFixedListForWrite,
  toRosterPlayerDto,
} from './pelada-roster.logic';

const samplePlayer = {
  id: 'p1',
  peladaId: 'pel1',
  userId: null,
  displayName: 'Ana',
  isGoalkeeper: false,
  position: 'Meio',
  rating: 8,
  attributes: {},
  tags: ['passe'],
  paymentPlan: 'PER_MATCH',
  isFixedList: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Player;

describe('pelada roster logic (3.7-API)', () => {
  it('toRosterPlayerDto mapeia campos da lista §3.7', () => {
    expect(toRosterPlayerDto(samplePlayer)).toEqual({
      id: 'p1',
      displayName: 'Ana',
      isGoalkeeper: false,
      position: 'Meio',
      rating: 8,
      tags: ['passe'],
      isFixedList: true,
      userId: null,
    });
  });

  it('assertFixedListAllowed rejeita fixo sem fixedListOnly', () => {
    expect(() => assertFixedListAllowed(false, true)).toThrow(BadRequestException);
    expect(() => assertFixedListAllowed(false, false)).not.toThrow();
    expect(() => assertFixedListAllowed(true, true)).not.toThrow();
  });

  it('resolveIsFixedListForWrite força false quando regra desligada', () => {
    expect(resolveIsFixedListForWrite(false, undefined, true)).toBe(false);
    expect(resolveIsFixedListForWrite(true, true, false)).toBe(true);
  });

  it('normalizePlayerAttributes preenche padrão 5', () => {
    expect(normalizePlayerAttributes({ chute: 8 })).toMatchObject({
      chute: 8,
      tecnica: 5,
    });
  });

  it('canPatchPlayerProfile respeita organizador e L27', () => {
    expect(
      canPatchPlayerProfile({
        isOrganizador: true,
        allowPlayerSelfEdit: false,
        playerUserId: 'u2',
        currentUserId: 'u1',
      }),
    ).toBe(true);
    expect(
      canPatchPlayerProfile({
        isOrganizador: false,
        allowPlayerSelfEdit: true,
        playerUserId: 'u1',
        currentUserId: 'u1',
      }),
    ).toBe(true);
    expect(
      canPatchPlayerProfile({
        isOrganizador: false,
        allowPlayerSelfEdit: false,
        playerUserId: 'u1',
        currentUserId: 'u1',
      }),
    ).toBe(false);
  });
});
