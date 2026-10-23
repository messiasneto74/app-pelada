import type { PrismaService } from '../../src/prisma/prisma.service';
import type { User } from '@prisma/client';

export type CreateUserInput = {
  keycloakSub?: string;
  email?: string | null;
  phone?: string | null;
};

export async function createUser(
  prisma: PrismaService,
  input: CreateUserInput = {},
): Promise<User> {
  const keycloakSub = input.keycloakSub ?? `kc-sub-${Date.now()}-${Math.random()}`;
  return prisma.user.create({
    data: {
      keycloakSub,
      email: input.email ?? `${keycloakSub}@pelada.test`,
      phone: input.phone ?? null,
    },
  });
}
