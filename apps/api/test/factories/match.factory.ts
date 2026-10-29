import type { Match, Pelada } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { PeladaWithOwner } from './pelada.factory';
import { createPelada } from './pelada.factory';

export type CreateMatchInput = {
  pelada?: PeladaWithOwner;
  scheduledAt?: Date;
  rulesOverride?: Record<string, unknown> | null;
};

export async function createMatch(
  prisma: PrismaService,
  input: CreateMatchInput = {},
): Promise<Match & { pelada: Pelada }> {
  const pelada = input.pelada ?? (await createPelada(prisma));
  const scheduledAt = input.scheduledAt ?? new Date('2026-11-01T19:00:00.000Z');

  return prisma.match.create({
    data: {
      peladaId: pelada.id,
      scheduledAt,
      ...(input.rulesOverride !== undefined && {
        rulesOverride: input.rulesOverride,
      }),
    },
    include: { pelada: true },
  });
}
