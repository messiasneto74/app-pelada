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

export type MyPeladaSummary = {
  id: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
  role: string;
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

  /**
   * Peladas do usuário autenticado (C1 — restaura a pelada ativa ao abrir
   * em outro aparelho/sessão em vez de depender só do sessionStorage).
   * Organizador primeiro, depois ordem de entrada.
   */
  async listMyPeladas(auth: AuthUserPayload): Promise<MyPeladaSummary[]> {
    const user = await this.getOrCreateUser(auth);
    const memberships = await this.prisma.peladaMember.findMany({
      where: { userId: user.id },
      include: { pelada: true },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships
      .map((m) => ({
        id: m.pelada.id,
        name: m.pelada.name,
        photoUrl: m.pelada.photoUrl,
        defaultWeekday: m.pelada.defaultWeekday,
        defaultLocation: m.pelada.defaultLocation,
        role: m.role as string,
      }))
      .sort((a, b) => (a.role === b.role ? 0 : a.role === 'ORGANIZADOR' ? -1 : 1));
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
