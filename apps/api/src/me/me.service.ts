import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { AuthUserPayload } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { PatchMeDto } from './patch-me.dto';

export type MeResponse = {
  id: string;
  keycloakSub: string;
  email: string | null;
  phone: string | null;
};

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUser(auth: AuthUserPayload): Promise<User> {
    return this.prisma.user.upsert({
      where: { keycloakSub: auth.sub },
      create: {
        keycloakSub: auth.sub,
        email: auth.email ?? null,
      },
      update: {
        ...(auth.email ? { email: auth.email } : {}),
      },
    });
  }

  async getMe(auth: AuthUserPayload): Promise<MeResponse> {
    const user = await this.getOrCreateUser(auth);
    return this.toResponse(user);
  }

  async patchMe(auth: AuthUserPayload, dto: PatchMeDto): Promise<MeResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { keycloakSub: auth.sub },
    });
    if (!existing) {
      await this.getOrCreateUser(auth);
    }

    const user = await this.prisma.user.update({
      where: { keycloakSub: auth.sub },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      },
    });
    return this.toResponse(user);
  }

  private toResponse(user: User): MeResponse {
    return {
      id: user.id,
      keycloakSub: user.keycloakSub,
      email: user.email,
      phone: user.phone,
    };
  }
}
