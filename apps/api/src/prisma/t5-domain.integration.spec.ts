import { PrismaClient } from '@prisma/client';
import { createPelada } from '../../test/factories/pelada.factory';

const runDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

(runDb ? describe : describe.skip)('T5 domain model (Prisma)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persiste regras, jogador, partida, presença, time e pagamento', async () => {
    const pelada = await createPelada(prisma, { name: 'T5 domain' });

    await prisma.peladaRules.update({
      where: { peladaId: pelada.id },
      data: {
        playersPerTeam: 6,
        teamCount: 2,
        capacity: 14,
      },
    });

    const player = await prisma.player.create({
      data: {
        peladaId: pelada.id,
        displayName: 'Cafu',
        rating: 8,
        tags: ['linha'],
      },
    });

    const match = await prisma.match.create({
      data: {
        peladaId: pelada.id,
        scheduledAt: new Date('2026-11-05T19:00:00Z'),
        location: 'Campo do Zé',
      },
    });

    await prisma.matchAttendance.create({
      data: {
        matchId: match.id,
        playerId: player.id,
        status: 'CONFIRMED',
      },
    });

    const draw = await prisma.draw.create({
      data: {
        matchId: match.id,
        balanceScore: 92,
        seed: 'test-seed',
        teams: {
          create: [
            {
              name: 'Time A',
              sortOrder: 0,
              players: {
                create: { playerId: player.id, sortOrder: 0 },
              },
            },
          ],
        },
      },
      include: { teams: { include: { players: true } } },
    });

    expect(draw.teams).toHaveLength(1);
    expect(draw.teams[0].players).toHaveLength(1);

    await prisma.paymentLedger.create({
      data: {
        peladaId: pelada.id,
        playerId: player.id,
        matchId: match.id,
        amountCents: 2500,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    const rules = await prisma.peladaRules.findUnique({
      where: { peladaId: pelada.id },
    });
    expect(rules?.capacity).toBe(14);

    await prisma.pelada.delete({ where: { id: pelada.id } });
    await prisma.user.delete({ where: { id: pelada.ownerId } });
  });
});
