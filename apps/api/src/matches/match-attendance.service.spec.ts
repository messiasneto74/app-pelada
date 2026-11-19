import { MatchAttendanceService } from './match-attendance.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MeService } from '../me/me.service';
import type { PeladaRules } from '@prisma/client';

/**
 * Issue #179 — cobre o hook `maybeAutoPromoteGuest`, chamado por
 * `patchPlayerAttendance`/`selfAttendance` depois de confirmar presença.
 * Testado direto (método privado) porque o fluxo público inteiro depende de
 * `$transaction`/`$executeRaw` sem relação com a promoção em si.
 */
describe('MatchAttendanceService — auto-promover convidado (issue #179)', () => {
  const defaults = (extra: Record<string, unknown>) =>
    ({ extra } as unknown as PeladaRules);

  let prisma: {
    matchAttendance: { findUnique: jest.Mock; count: jest.Mock };
    player: { findUnique: jest.Mock; update: jest.Mock };
  };
  let service: MatchAttendanceService & {
    maybeAutoPromoteGuest(
      matchId: string,
      playerId: string,
      rules: PeladaRules,
    ): Promise<void>;
  };

  beforeEach(() => {
    prisma = {
      matchAttendance: { findUnique: jest.fn(), count: jest.fn() },
      player: { findUnique: jest.fn(), update: jest.fn() },
    };
    service = new MatchAttendanceService(
      prisma as unknown as PrismaService,
      {} as MeService,
    ) as typeof service;
  });

  it('promove convidado vinculado a conta ao atingir o limiar', async () => {
    prisma.matchAttendance.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
    prisma.player.findUnique.mockResolvedValue({
      id: 'pl-1',
      isGuest: true,
      userId: 'u1',
    });
    prisma.matchAttendance.count.mockResolvedValue(3);

    await service.maybeAutoPromoteGuest(
      'm1',
      'pl-1',
      defaults({ autoPromoteAfterPresences: 3 }),
    );

    expect(prisma.player.update).toHaveBeenCalledWith({
      where: { id: 'pl-1' },
      data: { isGuest: false },
    });
  });

  it('não promove abaixo do limiar', async () => {
    prisma.matchAttendance.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
    prisma.player.findUnique.mockResolvedValue({
      id: 'pl-1',
      isGuest: true,
      userId: 'u1',
    });
    prisma.matchAttendance.count.mockResolvedValue(2);

    await service.maybeAutoPromoteGuest(
      'm1',
      'pl-1',
      defaults({ autoPromoteAfterPresences: 3 }),
    );

    expect(prisma.player.update).not.toHaveBeenCalled();
  });

  it('não promove convidado avulso de partida (sem userId)', async () => {
    prisma.matchAttendance.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
    prisma.player.findUnique.mockResolvedValue({
      id: 'pl-2',
      isGuest: true,
      userId: null,
    });
    prisma.matchAttendance.count.mockResolvedValue(10);

    await service.maybeAutoPromoteGuest(
      'm1',
      'pl-2',
      defaults({ autoPromoteAfterPresences: 1 }),
    );

    expect(prisma.player.update).not.toHaveBeenCalled();
  });

  it('não promove quando a regra está desativada (threshold 0/ausente)', async () => {
    await service.maybeAutoPromoteGuest('m1', 'pl-1', defaults({}));

    expect(prisma.matchAttendance.findUnique).not.toHaveBeenCalled();
    expect(prisma.player.update).not.toHaveBeenCalled();
  });

  it('não promove quando a presença atual não está confirmada', async () => {
    prisma.matchAttendance.findUnique.mockResolvedValue({ status: 'PENDING' });

    await service.maybeAutoPromoteGuest(
      'm1',
      'pl-1',
      defaults({ autoPromoteAfterPresences: 1 }),
    );

    expect(prisma.player.findUnique).not.toHaveBeenCalled();
    expect(prisma.player.update).not.toHaveBeenCalled();
  });

  it('não promove jogador já fixo (isGuest false)', async () => {
    prisma.matchAttendance.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
    prisma.player.findUnique.mockResolvedValue({
      id: 'pl-1',
      isGuest: false,
      userId: 'u1',
    });
    prisma.matchAttendance.count.mockResolvedValue(10);

    await service.maybeAutoPromoteGuest(
      'm1',
      'pl-1',
      defaults({ autoPromoteAfterPresences: 1 }),
    );

    expect(prisma.player.update).not.toHaveBeenCalled();
  });
});
