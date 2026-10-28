import type { PrismaService } from '../../src/prisma/prisma.service';

/** Limpa tabelas de domínio entre casos de integração (ordem respeita FKs). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      draw_team_players,
      draw_teams,
      draws,
      match_attendances,
      payment_ledger,
      matches,
      players,
      pelada_rules,
      pelada_members,
      peladas,
      users
    RESTART IDENTITY CASCADE
  `);
}
