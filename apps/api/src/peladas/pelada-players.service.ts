import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUserPayload } from '../auth/auth-user';
import { CreatePlayerDto } from '../domain/dto/create-player.dto';
import { PatchPlayerDto } from '../domain/dto/patch-player.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  type PeladaRosterDto,
  resolveIsFixedListForWrite,
  toRosterPlayerDto,
} from './pelada-roster.logic';

@Injectable()
export class PeladaPlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async listPlayers(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<PeladaRosterDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const players = await this.prisma.player.findMany({
      where: { peladaId },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    });

    return {
      peladaId,
      players: players.map(toRosterPlayerDto),
    };
  }

  async createPlayer(
    auth: AuthUserPayload,
    peladaId: string,
    dto: CreatePlayerDto,
  ) {
    const user = await this.meService.getOrCreateUser(auth);
    const fixedListOnly = await this.assertOrganizadorWithRules(peladaId, user.id);

    const isFixedList = resolveIsFixedListForWrite(
      fixedListOnly,
      dto.isFixedList,
      false,
    );

    const player = await this.prisma.player.create({
      data: {
        peladaId,
        displayName: dto.displayName.trim(),
        isGoalkeeper: dto.isGoalkeeper ?? false,
        position: dto.position?.trim() || null,
        rating: dto.rating ?? null,
        tags: dto.tags ?? [],
        paymentPlan: dto.paymentPlan,
        isFixedList,
      },
    });

    return toRosterPlayerDto(player);
  }

  async patchPlayer(
    auth: AuthUserPayload,
    peladaId: string,
    playerId: string,
    dto: PatchPlayerDto,
  ) {
    const user = await this.meService.getOrCreateUser(auth);
    const fixedListOnly = await this.assertOrganizadorWithRules(peladaId, user.id);

    const existing = await this.prisma.player.findFirst({
      where: { id: playerId, peladaId },
    });
    if (!existing) {
      throw new NotFoundException('Jogador não encontrado nesta pelada.');
    }

    const isFixedList = resolveIsFixedListForWrite(
      fixedListOnly,
      dto.isFixedList,
      existing.isFixedList,
    );

    const player = await this.prisma.player.update({
      where: { id: playerId },
      data: {
        ...(dto.displayName !== undefined && {
          displayName: dto.displayName.trim(),
        }),
        ...(dto.isGoalkeeper !== undefined && {
          isGoalkeeper: dto.isGoalkeeper,
        }),
        ...(dto.position !== undefined && {
          position: dto.position.trim() || null,
        }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.paymentPlan !== undefined && { paymentPlan: dto.paymentPlan }),
        isFixedList,
      },
    });

    return toRosterPlayerDto(player);
  }

  async deletePlayer(
    auth: AuthUserPayload,
    peladaId: string,
    playerId: string,
  ): Promise<void> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizadorWithRules(peladaId, user.id);

    const existing = await this.prisma.player.findFirst({
      where: { id: playerId, peladaId },
    });
    if (!existing) {
      throw new NotFoundException('Jogador não encontrado nesta pelada.');
    }

    await this.prisma.player.delete({ where: { id: playerId } });
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

  private async assertOrganizadorWithRules(
    peladaId: string,
    userId: string,
  ): Promise<boolean> {
    await this.assertMember(peladaId, userId);
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (member?.role !== 'ORGANIZADOR') {
      throw new ForbiddenException('Somente organizador altera o elenco.');
    }
    const rules = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!rules) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }
    return rules.fixedListOnly;
  }
}
