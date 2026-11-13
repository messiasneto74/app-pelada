import type { Player } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';

export async function createPlayer(
  prisma: PrismaService,
  input: { peladaId: string; displayName?: string },
): Promise<Player> {
  return prisma.player.create({
    data: {
      peladaId: input.peladaId,
      displayName: input.displayName ?? 'Jogador Teste',
    },
  });
}
