import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUserPayload } from '../auth/auth-user';
import { PatchPeladaRulesDto } from '../domain/dto/patch-pelada-rules.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoStorageService } from '../storage/photo-storage.service';
import {
  mergeEffectiveMatchRules,
  type MatchRulesOverrideJson,
} from '../matches/match-rules.merge';
import { CreatePeladaDto } from './dto/create-pelada.dto';
import {
  assertGoalkeeperExclusive,
  mergeExtra,
} from './pelada-rules.validation';
import {
  computeMatchCapacity,
  effectiveModalityForMatch,
  monthUtcBounds,
  type PeladaDashboardResponse,
} from './pelada-dashboard.logic';

export type PeladaRulesResponse = {
  peladaId: string;
  playersPerTeam: number;
  teamCount: number;
  modality: string;
  goalkeeperMode: string;
  presenceMode: string;
  capacity: number | null;
  allowPlayerSelfEdit: boolean;
  fixedListOnly: boolean;
  drawWeights: Record<string, unknown>;
  extra: Record<string, unknown>;
};

export type PeladaCreatedResponse = {
  id: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
};

@Injectable()
export class PeladasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
    private readonly photoStorage: PhotoStorageService,
  ) {}

  async createPelada(
    auth: AuthUserPayload,
    dto: CreatePeladaDto,
    photo?: Express.Multer.File,
  ): Promise<PeladaCreatedResponse> {
    if (photo) {
      this.photoStorage.assertValidUpload(photo);
    }

    const user = await this.meService.getOrCreateUser(auth);

    const pelada = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pelada.create({
        data: {
          name: dto.name.trim(),
          ownerId: user.id,
          defaultWeekday: dto.defaultWeekday ?? null,
          defaultLocation: dto.defaultLocation?.trim() || null,
          members: {
            create: {
              userId: user.id,
              role: 'ORGANIZADOR',
            },
          },
          rules: {
            create: {},
          },
        },
      });

      let photoUrl: string | null = null;
      if (photo) {
        photoUrl = await this.photoStorage.savePeladaPhoto(created.id, photo);
        return tx.pelada.update({
          where: { id: created.id },
          data: { photoUrl },
        });
      }

      return created;
    });

    return {
      id: pelada.id,
      name: pelada.name,
      photoUrl: pelada.photoUrl,
      defaultWeekday: pelada.defaultWeekday,
      defaultLocation: pelada.defaultLocation,
    };
  }

  async getPeladaRules(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<PeladaRulesResponse> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const rules = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!rules) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }
    return this.toRulesResponse(rules);
  }

  async patchPeladaRules(
    auth: AuthUserPayload,
    peladaId: string,
    dto: PatchPeladaRulesDto,
  ): Promise<PeladaRulesResponse> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);

    const existing = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!existing) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }

    const mergedExtra = mergeExtra(existing.extra, dto.extra);
    const nextGoalkeeperMode = dto.goalkeeperMode ?? existing.goalkeeperMode;
    assertGoalkeeperExclusive(nextGoalkeeperMode, mergedExtra);

    const updated = await this.prisma.peladaRules.update({
      where: { peladaId },
      data: {
        ...(dto.playersPerTeam !== undefined && {
          playersPerTeam: dto.playersPerTeam,
        }),
        ...(dto.teamCount !== undefined && { teamCount: dto.teamCount }),
        ...(dto.modality !== undefined && { modality: dto.modality }),
        ...(dto.goalkeeperMode !== undefined && {
          goalkeeperMode: dto.goalkeeperMode,
        }),
        ...(dto.presenceMode !== undefined && {
          presenceMode: dto.presenceMode,
        }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.allowPlayerSelfEdit !== undefined && {
          allowPlayerSelfEdit: dto.allowPlayerSelfEdit,
        }),
        ...(dto.fixedListOnly !== undefined && {
          fixedListOnly: dto.fixedListOnly,
        }),
        ...(dto.drawWeights !== undefined && {
          drawWeights: dto.drawWeights as Prisma.InputJsonValue,
        }),
        ...(dto.extra !== undefined && {
          extra: mergedExtra as Prisma.InputJsonValue,
        }),
      },
    });

    return this.toRulesResponse(updated);
  }

  async getPeladaMembership(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<{ peladaId: string; role: string }> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId: user.id } },
    });
    return { peladaId, role: member!.role };
  }

  async getPeladaDashboard(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<PeladaDashboardResponse> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const rules = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!rules) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }

    const now = new Date();
    const { start: monthStart, end: monthEnd } = monthUtcBounds(now);

    const [rosterPlayerCount, nextMatch, receivedAgg, expectedAgg] =
      await Promise.all([
        this.prisma.player.count({ where: { peladaId } }),
        this.prisma.match.findFirst({
          where: {
            peladaId,
            status: { not: 'FINISHED' },
            scheduledAt: { gte: now },
          },
          orderBy: { scheduledAt: 'asc' },
          include: {
            attendances: {
              where: { status: 'CONFIRMED' },
              include: { player: true },
              orderBy: { createdAt: 'asc' },
              take: 8,
            },
          },
        }),
        this.prisma.paymentLedger.aggregate({
          where: {
            peladaId,
            status: 'PAID',
            paidAt: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amountCents: true },
        }),
        this.prisma.paymentLedger.aggregate({
          where: {
            peladaId,
            status: { in: ['PENDING', 'PAID'] },
            createdAt: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amountCents: true },
        }),
      ]);

    let nextMatchJson: PeladaDashboardResponse['nextMatch'] = null;
    if (nextMatch) {
      const effective = mergeEffectiveMatchRules(
        rules,
        nextMatch.rulesOverride as MatchRulesOverrideJson | null,
      );
      const capacity = computeMatchCapacity(effective);
      const confirmedCount = await this.prisma.matchAttendance.count({
        where: { matchId: nextMatch.id, status: 'CONFIRMED' },
      });
      const confirmedPlayers = nextMatch.attendances.map((a) => ({
        id: a.playerId,
        displayName: a.isGuest
          ? (a.guestName?.trim() || 'Convidado')
          : a.player.displayName,
      }));
      nextMatchJson = {
        id: nextMatch.id,
        scheduledAt: nextMatch.scheduledAt.toISOString(),
        location: nextMatch.location,
        modality: effectiveModalityForMatch(rules, nextMatch.rulesOverride),
        confirmedCount,
        capacity,
        confirmedPlayers,
      };
    }

    return {
      peladaId,
      nextMatch: nextMatchJson,
      rosterPlayerCount,
      cashMonth: {
        receivedCents: receivedAgg._sum.amountCents ?? 0,
        expectedCents: expectedAgg._sum.amountCents ?? 0,
      },
    };
  }

  private async assertMember(peladaId: string, userId: string): Promise<void> {
    const pelada = await this.prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) {
      throw new NotFoundException('Pelada não encontrada.');
    }
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Sem acesso a esta pelada.');
    }
  }

  private async assertOrganizador(
    peladaId: string,
    userId: string,
  ): Promise<void> {
    await this.assertMember(peladaId, userId);
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (member?.role !== 'ORGANIZADOR') {
      throw new ForbiddenException('Somente organizador altera regras.');
    }
  }

  private toRulesResponse(rules: {
    peladaId: string;
    playersPerTeam: number;
    teamCount: number;
    modality: string;
    goalkeeperMode: string;
    presenceMode: string;
    capacity: number | null;
    allowPlayerSelfEdit: boolean;
    fixedListOnly: boolean;
    drawWeights: unknown;
    extra: unknown;
  }): PeladaRulesResponse {
    return {
      peladaId: rules.peladaId,
      playersPerTeam: rules.playersPerTeam,
      teamCount: rules.teamCount,
      modality: rules.modality,
      goalkeeperMode: rules.goalkeeperMode,
      presenceMode: rules.presenceMode,
      capacity: rules.capacity,
      allowPlayerSelfEdit: rules.allowPlayerSelfEdit,
      fixedListOnly: rules.fixedListOnly,
      drawWeights: (rules.drawWeights ?? {}) as Record<string, unknown>,
      extra: (rules.extra ?? {}) as Record<string, unknown>,
    };
  }
}
