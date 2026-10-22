import { PrismaClient } from '@prisma/client';

const runDb = process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL;

(runDb ? describe : describe.skip)('Prisma bootstrap (Postgres)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cria User, Pelada e membro ORGANIZADOR', async () => {
    const sub = `test-${Date.now()}`;
    const user = await prisma.user.create({
      data: {
        keycloakSub: sub,
        email: 'test@pelada.local',
      },
    });
    const pelada = await prisma.pelada.create({
      data: {
        name: 'Pelada teste',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'ORGANIZADOR',
          },
        },
      },
      include: { members: true },
    });
    expect(pelada.members).toHaveLength(1);
    expect(pelada.members[0].role).toBe('ORGANIZADOR');

    await prisma.pelada.delete({ where: { id: pelada.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
