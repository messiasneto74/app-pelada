import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUserPayload } from '../auth/auth-user';
import { CreatePlayerDto } from '../domain/dto/create-player.dto';
import { PatchPlayerDto } from '../domain/dto/patch-player.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoStorageService } from '../storage/photo-storage.service';
import {
  type PeladaRosterDto,
  canPatchPlayerProfile,
  normalizePlayerAttributes,
  pickSelfEditPatch,
  resolveIsFixedListForWrite,
  toPlayerProfileDto,
  toRosterPlayerDto,
} from './pelada-roster.logic';

@Injectable()
export class PeladaPlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
    private readonly photoStorage: PhotoStorageService,
  ) {}

  async listPlayers(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<PeladaRosterDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const players = await this.prisma.player.findMany({
      where: { peladaId, isGuest: false },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    });

    return {
      peladaId,
      players: players.map(toRosterPlayerDto),
    };
  }

  /** Lista "Convidados" (issue #172) — jogadores entrados por convite, ainda não promovidos. */
  async listGuests(
    auth: AuthUserPayload,
    peladaId: string,
  ): Promise<PeladaRosterDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const players = await this.prisma.player.findMany({
      where: { peladaId, isGuest: true },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    });

    return {
      peladaId,
      players: players.map(toRosterPlayerDto),
    };
  }

  /** Promove um Convidado pra Jogador (issue #172 — fase 1: só manual). */
  async promoteGuest(
    auth: AuthUserPayload,
    peladaId: string,
    playerId: string,
  ) {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizadorWithRules(peladaId, user.id);

    const existing = await this.prisma.player.findFirst({
      where: { id: playerId, peladaId },
    });
    if (!existing) {
      throw new NotFoundException('Jogador não encontrado nesta pelada.');
    }
    if (!existing.isGuest) {
      throw new ForbiddenException('Este jogador já não é um convidado.');
    }

    const player = await this.prisma.player.update({
      where: { id: playerId },
      data: { isGuest: false },
    });

    return toRosterPlayerDto(player);
  }

  async getPlayer(
    auth: AuthUserPayload,
    peladaId: string,
    playerId: string,
  ) {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const player = await this.prisma.player.findFirst({
      where: { id: playerId, peladaId },
    });
    if (!player) {
      throw new NotFoundException('Jogador não encontrado nesta pelada.');
    }

    return toPlayerProfileDto(player);
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
    photo?: Express.Multer.File,
  ) {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const existing = await this.prisma.player.findFirst({
      where: { id: playerId, peladaId },
    });
    if (!existing) {
      throw new NotFoundException('Jogador não encontrado nesta pelada.');
    }

    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId: user.id } },
    });
    const rules = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!rules) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }

    const isOrganizador = member?.role === 'ORGANIZADOR';
    if (
      !canPatchPlayerProfile({
        isOrganizador,
        allowPlayerSelfEdit: rules.allowPlayerSelfEdit,
        playerUserId: existing.userId,
        currentUserId: user.id,
      })
    ) {
      throw new ForbiddenException('Sem permissão para alterar este perfil.');
    }

    const patchDto = isOrganizador
      ? dto
      : (pickSelfEditPatch(dto as Record<string, unknown>) as PatchPlayerDto);

    const fixedListOnly = rules.fixedListOnly;
    const isFixedList = resolveIsFixedListForWrite(
      fixedListOnly,
      patchDto.isFixedList,
      existing.isFixedList,
    );

    const attributes =
      patchDto.attributes !== undefined
        ? normalizePlayerAttributes({
            ...((existing.attributes as Record<string, unknown>) ?? {}),
            ...patchDto.attributes,
          })
        : undefined;

    let photoUrl: string | undefined;
    if (photo) {
      this.photoStorage.assertValidUpload(photo);
      photoUrl = await this.photoStorage.savePlayerPhoto(playerId, photo);
    }

    const player = await this.prisma.player.update({
      where: { id: playerId },
      data: {
        ...(patchDto.displayName !== undefined && {
          displayName: patchDto.displayName.trim(),
        }),
        ...(patchDto.isGoalkeeper !== undefined && {
          isGoalkeeper: patchDto.isGoalkeeper,
        }),
        ...(patchDto.position !== undefined && {
          position: patchDto.position.trim() || null,
        }),
        ...(patchDto.rating !== undefined && { rating: patchDto.rating }),
        ...(patchDto.tags !== undefined && { tags: patchDto.tags }),
        ...(patchDto.paymentPlan !== undefined && {
          paymentPlan: patchDto.paymentPlan,
        }),
        ...(attributes !== undefined && { attributes }),
        ...(photoUrl !== undefined && { photoUrl }),
        isFixedList,
      },
    });

    return toPlayerProfileDto(player);
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

    // Issue #223 — sair/ser removido apaga tudo: o jogador (e, em cascata,
    // presenças, sorteios, gols e cobranças) e também o vínculo da conta com a
    // pelada. Quem é organizador continua organizador (só perde o jogador).
    await this.prisma.$transaction(async (tx) => {
      await tx.player.delete({ where: { id: playerId } });
      if (existing.userId) {
        await tx.peladaMember.deleteMany({
          where: { peladaId, userId: existing.userId, role: 'JOGADOR' },
        });
      }
    });
  }

  /**
   * Issue #223 — o próprio usuário sai da pelada (usado pela tela Meu perfil,
   * #226): apaga o jogador dele nessa pelada (com todo o histórico) e o vínculo.
   * O último organizador não pode sair, senão a pelada fica sem dono.
   */
  async leavePelada(auth: AuthUserPayload, peladaId: string): Promise<void> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);
    const member = await this.prisma.peladaMember.findUniqueOrThrow({
      where: { peladaId_userId: { peladaId, userId: user.id } },
    });
    if (member.role === 'ORGANIZADOR') {
      const organizers = await this.prisma.peladaMember.count({
        where: { peladaId, role: 'ORGANIZADOR' },
      });
      if (organizers <= 1) {
        throw new BadRequestException(
          'Você é o único organizador desta pelada. Passe a organização para outra pessoa antes de sair.',
        );
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.player.deleteMany({ where: { peladaId, userId: user.id } });
      await tx.peladaMember.delete({ where: { id: member.id } });
    });
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
