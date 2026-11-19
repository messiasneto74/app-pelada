import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { AuthUserPayload } from '../auth/auth-user';
import { MailService } from '../mail/mail.service';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_VALIDITY_MS = 5 * 60 * 60 * 1000;

export type CreatedInviteDto = {
  token: string;
  peladaId: string;
  expiresAt: string;
};

export type SendInviteEmailResultDto = {
  emailSent: boolean;
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

/**
 * Nome de exibição pro jogador criado via convite: o nome da conta (claim do
 * token); sem ele, o começo do e-mail.
 */
function inviteDisplayName(auth: AuthUserPayload): string {
  const name = auth.name?.trim();
  if (name) {
    return name.slice(0, 60);
  }
  const local = auth.email?.split('@')[0]?.trim();
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
    private readonly mailService: MailService,
    private readonly config: ConfigService,
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

  /**
   * Issue #179b — reenvia o convite **já existente** (mesmo token do
   * link/QR) por e-mail. Nunca cria um novo convite: evita tokens
   * concorrentes e mantém persistência/envio desacoplados (falha de SMTP
   * não invalida nem duplica o convite já em uso).
   */
  async sendInviteEmail(
    auth: AuthUserPayload,
    token: string,
    email: string,
  ): Promise<SendInviteEmailResultDto> {
    const invite = await this.findValidInviteOrThrow(token);
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(invite.peladaId, user.id);

    if (!this.mailService.isConfigured()) {
      return { emailSent: false };
    }

    try {
      await this.mailService.sendInviteEmail({
        to: email,
        peladaName: invite.pelada.name,
        inviteUrl: this.buildInviteUrl(invite.token),
        expiresAt: invite.expiresAt,
      });
      return { emailSent: true };
    } catch {
      return { emailSent: false };
    }
  }

  private buildInviteUrl(token: string): string {
    const webUrl =
      this.config.get<string>('PELADA_WEB_URL') ?? 'http://localhost:4200';
    return `${webUrl.replace(/\/$/, '')}/convite/${token}`;
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
      const claimed = await tx.peladaInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date(), usedByUserId: user.id },
      });
      if (claimed.count !== 1) {
        throw new GoneException('Este convite já foi usado.');
      }
      await tx.peladaMember.create({
        data: { peladaId: invite.peladaId, userId: user.id, role: 'JOGADOR' },
      });
      await tx.player.create({
        data: {
          peladaId: invite.peladaId,
          userId: user.id,
          displayName: inviteDisplayName(auth),
          isGuest: true,
        },
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

  private async assertOrganizador(peladaId: string, userId: string) {
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
    return pelada;
  }
}
