import type { PrismaService } from '../../src/prisma/prisma.service';

/** Limpa tabelas de domínio entre casos de integração (ordem respeita FKs). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE pelada_members, peladas, users RESTART IDENTITY CASCADE',
  );
}
