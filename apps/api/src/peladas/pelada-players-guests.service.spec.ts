import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PeladaPlayersService } from './pelada-players.service';
import type { MeService } from '../me/me.service';
import type { PhotoStorageService } from '../storage/photo-storage.service';
import type { PrismaService } from '../prisma/prisma.service';

/** Issue #172 (fase 1) — lista "Convidados" e promoção manual pra Jogador. */
describe('PeladaPlayersService — convidados (issue #172)', () => {
  const auth = { sub: 'kc-sub-1', email: 'org@example.com' };
  const user = { id: 'u1', keycloakSub: 'kc-sub-1', email: auth.email, phone: null };

  let prisma: {
    pelada: { findUnique: jest.Mock };
    peladaMember: { findUnique: jest.Mock };
    peladaRules: { findUnique: jest.Mock };
    player: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };
  let meService: { getOrCreateUser: jest.Mock };
  let service: PeladaPlayersService;

  const guestPlayer = {
    id: 'pl-1',
    peladaId: 'pel-1',
    userId: 'u2',
    displayName: 'convidado.fulano',
    isGuest: true,
    isGoalkeeper: false,
    position: null,
    rating: null,
    attributes: {},
    tags: [],
    paymentPlan: 'PER_MATCH',
    isFixedList: false,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      pelada: { findUnique: jest.fn().mockResolvedValue({ id: 'pel-1' }) },
      peladaMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'ORGANIZADOR' }),
      },
      peladaRules: {
        findUnique: jest.fn().mockResolvedValue({ fixedListOnly: false }),
      },
      player: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    meService = { getOrCreateUser: jest.fn().mockResolvedValue(user) };
    service = new PeladaPlayersService(
      prisma as unknown as PrismaService,
      meService as unknown as MeService,
      {} as unknown as PhotoStorageService,
    );
  });

  describe('listGuests', () => {
    it('lista só jogadores com isGuest true', async () => {
      prisma.player.findMany.mockResolvedValue([guestPlayer]);

      const result = await service.listGuests(auth, 'pel-1');

      expect(prisma.player.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { peladaId: 'pel-1', isGuest: true } }),
      );
      expect(result.players).toEqual([
        expect.objectContaining({ id: 'pl-1', isGuest: true }),
      ]);
    });
  });

  describe('promoteGuest', () => {
    it('organizador promove convidado pra jogador', async () => {
      prisma.player.findFirst.mockResolvedValue(guestPlayer);
      prisma.player.update.mockResolvedValue({ ...guestPlayer, isGuest: false });

      const result = await service.promoteGuest(auth, 'pel-1', 'pl-1');

      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 'pl-1' },
        data: { isGuest: false },
      });
      expect(result.isGuest).toBe(false);
    });

    it('não organizador recebe 403', async () => {
      prisma.peladaMember.findUnique.mockResolvedValue({ role: 'JOGADOR' });

      await expect(
        service.promoteGuest(auth, 'pel-1', 'pl-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.player.update).not.toHaveBeenCalled();
    });

    it('jogador inexistente recebe 404', async () => {
      prisma.player.findFirst.mockResolvedValue(null);

      await expect(
        service.promoteGuest(auth, 'pel-1', 'pl-x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('jogador que já não é convidado recebe 403', async () => {
      prisma.player.findFirst.mockResolvedValue({
        ...guestPlayer,
        isGuest: false,
      });

      await expect(
        service.promoteGuest(auth, 'pel-1', 'pl-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.player.update).not.toHaveBeenCalled();
    });
  });
});
