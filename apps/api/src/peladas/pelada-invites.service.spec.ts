import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { PeladaInvitesService } from './pelada-invites.service';
import type { MeService } from '../me/me.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('PeladaInvitesService (issue #172 — fase 1)', () => {
  const auth = { sub: 'kc-sub-1', email: 'ana.silva@example.com' };
  const user = { id: 'u1', keycloakSub: 'kc-sub-1', email: auth.email, phone: null };

  let prisma: {
    pelada: { findUnique: jest.Mock };
    peladaMember: { findUnique: jest.Mock; create: jest.Mock };
    peladaInvite: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    player: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let meService: { getOrCreateUser: jest.Mock };
  let service: PeladaInvitesService;

  const peladaRow = {
    id: 'pel-1',
    name: 'Pelada Teste',
    photoUrl: null,
    defaultWeekday: 2,
    defaultLocation: 'Quadra X',
  };

  beforeEach(() => {
    prisma = {
      pelada: { findUnique: jest.fn() },
      peladaMember: { findUnique: jest.fn(), create: jest.fn() },
      peladaInvite: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      player: { create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    meService = { getOrCreateUser: jest.fn().mockResolvedValue(user) };
    service = new PeladaInvitesService(
      prisma as unknown as PrismaService,
      meService as unknown as MeService,
    );
  });

  describe('createInvite', () => {
    it('organizador gera convite com validade de 5h', async () => {
      prisma.pelada.findUnique.mockResolvedValue(peladaRow);
      prisma.peladaMember.findUnique.mockResolvedValue({ role: 'ORGANIZADOR' });
      prisma.peladaInvite.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...data, id: 'inv-1' }),
      );

      const before = Date.now();
      const result = await service.createInvite(auth, 'pel-1');
      const after = Date.now();

      expect(prisma.peladaInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            peladaId: 'pel-1',
            createdByUserId: 'u1',
          }),
        }),
      );
      expect(result.peladaId).toBe('pel-1');
      expect(result.token).toMatch(/^[\w-]+$/);
      const expiresAtMs = new Date(result.expiresAt).getTime();
      const fiveHoursMs = 5 * 60 * 60 * 1000;
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + fiveHoursMs - 1000);
      expect(expiresAtMs).toBeLessThanOrEqual(after + fiveHoursMs + 1000);
    });

    it('não organizador recebe 403', async () => {
      prisma.pelada.findUnique.mockResolvedValue(peladaRow);
      prisma.peladaMember.findUnique.mockResolvedValue({ role: 'JOGADOR' });

      await expect(service.createInvite(auth, 'pel-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.peladaInvite.create).not.toHaveBeenCalled();
    });

    it('pelada inexistente recebe 404', async () => {
      prisma.pelada.findUnique.mockResolvedValue(null);

      await expect(service.createInvite(auth, 'pel-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('previewInvite', () => {
    it('convite válido retorna dados da pelada', async () => {
      prisma.peladaInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        peladaId: 'pel-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        pelada: peladaRow,
      });

      const result = await service.previewInvite('tok-1');

      expect(result).toEqual({
        peladaId: 'pel-1',
        peladaName: 'Pelada Teste',
        expiresAt: expect.any(String),
      });
    });

    it('token inexistente recebe 404', async () => {
      prisma.peladaInvite.findUnique.mockResolvedValue(null);
      await expect(service.previewInvite('tok-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('convite já usado recebe 410', async () => {
      prisma.peladaInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        peladaId: 'pel-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        pelada: peladaRow,
      });
      await expect(service.previewInvite('tok-1')).rejects.toThrow(
        GoneException,
      );
    });

    it('convite expirado recebe 410', async () => {
      prisma.peladaInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        peladaId: 'pel-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        pelada: peladaRow,
      });
      await expect(service.previewInvite('tok-1')).rejects.toThrow(
        GoneException,
      );
    });
  });

  describe('redeemInvite', () => {
    function mockValidInvite() {
      prisma.peladaInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        peladaId: 'pel-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        pelada: peladaRow,
      });
    }

    it('cria membership + jogador convidado e marca convite usado', async () => {
      mockValidInvite();
      prisma.peladaMember.findUnique.mockResolvedValue(null);

      const result = await service.redeemInvite(auth, 'tok-1');

      expect(prisma.peladaMember.create).toHaveBeenCalledWith({
        data: { peladaId: 'pel-1', userId: 'u1', role: 'JOGADOR' },
      });
      expect(prisma.player.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          peladaId: 'pel-1',
          userId: 'u1',
          displayName: 'ana.silva',
          isGuest: true,
        }),
      });
      expect(prisma.peladaInvite.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', usedAt: null },
        data: expect.objectContaining({ usedByUserId: 'u1' }),
      });
      expect(result).toEqual({
        peladaId: 'pel-1',
        name: 'Pelada Teste',
        photoUrl: null,
        defaultWeekday: 2,
        defaultLocation: 'Quadra X',
      });
    });

    it('usa nome genérico quando não há e-mail', async () => {
      mockValidInvite();
      prisma.peladaMember.findUnique.mockResolvedValue(null);

      await service.redeemInvite({ sub: 'kc-sub-2' }, 'tok-1');

      expect(prisma.player.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ displayName: 'Jogador convidado' }),
      });
    });

    it('usuário já membro recebe 409 e não duplica', async () => {
      mockValidInvite();
      prisma.peladaMember.findUnique.mockResolvedValue({ role: 'JOGADOR' });

      await expect(service.redeemInvite(auth, 'tok-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.peladaMember.create).not.toHaveBeenCalled();
      expect(prisma.player.create).not.toHaveBeenCalled();
    });

    it('resgate concorrente (uso único perdido na corrida) recebe 410 e não cria nada', async () => {
      mockValidInvite();
      prisma.peladaMember.findUnique.mockResolvedValue(null);
      // Simula outro resgate que já marcou usedAt dentro da mesma janela:
      // o UPDATE condicional (WHERE usedAt IS NULL) não afeta nenhuma linha.
      prisma.peladaInvite.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.redeemInvite(auth, 'tok-1')).rejects.toThrow(
        GoneException,
      );
      expect(prisma.peladaMember.create).not.toHaveBeenCalled();
      expect(prisma.player.create).not.toHaveBeenCalled();
    });

    it('convite expirado recebe 410 e não cria nada', async () => {
      prisma.peladaInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        peladaId: 'pel-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        pelada: peladaRow,
      });

      await expect(service.redeemInvite(auth, 'tok-1')).rejects.toThrow(
        GoneException,
      );
      expect(prisma.peladaMember.create).not.toHaveBeenCalled();
    });
  });
});
