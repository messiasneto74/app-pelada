import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUserPayload } from '../auth/auth-user';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_VALIDITY_MS = 5 * 60 * 60 * 1000;

export type CreatedInviteDto = {
  token: string;
  peladaId: string;
  expiresAt: string;
};

export type InvitePreviewDto = {
  peladaId: string;
  peladaName: string;
  expiresAt: string;
};

export type RedeemedInviteDto = {
  peladaId: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
};

function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Nome de exibição default pro jogador criado via convite, a partir do e-mail. */
function displayNameFromEmail(email: string | undefined): string {
  const local = email?.split('@')[0]?.trim();
  if (local && local.length >= 2) {
    return local;
  }
  return 'Jogador convidado';
}

@Injectable()
export class PeladaInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async createInvite(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<CreatedInviteDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);

    const expiresAt = new Date(Date.now() + INVITE_VALIDITY_MS);
    const invite = await this.prisma.peladaInvite.create({
      data: {
        peladaId,
        token: generateInviteToken(),
        createdByUserId: user.id,
        expiresAt,
      },
    });

    return {
      token: invite.token,
      peladaId: invite.peladaId,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async previewInvite(token: string): Promise<InvitePreviewDto> {
    const invite = await this.findValidInviteOrThrow(token);
    return {
      peladaId: invite.pelada.id,
      peladaName: invite.pelada.name,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async redeemInvite(
    auth: AuthUserPayload,
    token: string,
  ): Promise<RedeemedInviteDto> {
    const invite = await this.findValidInviteOrThrow(token);
    const user = await this.meService.getOrCreateUser(auth);

    const existingMember = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId: invite.peladaId, userId: user.id } },
    });
    if (existingMember) {
      throw new ConflictException('Você já faz parte desta pelada.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.peladaMember.create({
        data: { peladaId: invite.peladaId, userId: user.id, role: 'JOGADOR' },
      });
      await tx.player.create({
        data: {
          peladaId: invite.peladaId,
          userId: user.id,
          displayName: displayNameFromEmail(auth.email),
          isGuest: true,
        },
      });
      await tx.peladaInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedByUserId: user.id },
      });
    });

    return {
      peladaId: invite.pelada.id,
      name: invite.pelada.name,
      photoUrl: invite.pelada.photoUrl,
      defaultWeekday: invite.pelada.defaultWeekday,
      defaultLocation: invite.pelada.defaultLocation,
    };
  }

  private async findValidInviteOrThrow(token: string) {
    const invite = await this.prisma.peladaInvite.findUnique({
      where: { token },
      include: { pelada: true },
    });
    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }
    if (invite.usedAt) {
      throw new GoneException('Este convite já foi usado.');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new GoneException('Este convite expirou.');
    }
    return invite;
  }

  private async assertOrganizador(
    peladaId: string,
    userId: string,
  ): Promise<void> {
    const pelada = await this.prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) {
      throw new NotFoundException('Pelada não encontrada.');
    }
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (member?.role !== 'ORGANIZADOR') {
      throw new ForbiddenException('Somente organizador gera convites.');
    }
  }
}
