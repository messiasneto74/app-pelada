import type { Pelada, PeladaMember, User } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { createUser } from './user.factory';

export type PeladaWithOwner = Pelada & {
  owner: User;
  members: PeladaMember[];
};

export type CreatePeladaInput = {
  name?: string;
  owner?: User;
};

export async function createPelada(
  prisma: PrismaService,
  input: CreatePeladaInput = {},
): Promise<PeladaWithOwner> {
  const owner = input.owner ?? await createUser(prisma);
  const name = input.name ?? 'Pelada harness';

  return prisma.pelada.create({
    data: {
      name,
      ownerId: owner.id,
      members: {
        create: {
          userId: owner.id,
          role: 'ORGANIZADOR',
        },
      },
    },
    include: {
      owner: true,
      members: true,
    },
  });
}
