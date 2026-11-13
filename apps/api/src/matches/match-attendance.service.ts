import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AttendanceStatus, Match, PeladaRules, Prisma } from '@prisma/client';
import type { AuthUserPayload } from '../auth/auth-user';
import { UpdateAttendanceDto } from '../domain/dto/update-attendance.dto';
import { GuestAttendanceRequestDto } from '../domain/dto/guest-attendance-request.dto';
import { SelfAttendanceDto } from '../domain/dto/self-attendance.dto';
import { MeService } from '../me/me.service';
import { computeMatchCapacity } from '../peladas/pelada-dashboard.logic';
import { PrismaService } from '../prisma/prisma.service';
import { mergeEffectiveMatchRules } from './match-rules.merge';
import type { MatchRulesOverrideJson } from './match-rules.merge';
import {
  applyAttendanceStatusChange,
  attendanceCounts,
  type AttendanceRowInput,
} from './match-attendance.logic';

export type MatchAttendanceEntryDto = {
  playerId: string;
  displayName: string;
  status: AttendanceStatus;
  queuePosition: number | null;
  isGuest: boolean;
  guestName: string | null;
  isGoalkeeper: boolean;
  position: string | null;
  rating: number | null;
};

export type MatchAttendanceListDto = {
  matchId: string;
  peladaId: string;
  listClosed: boolean;
  capacity: number;
  presenceMode: string | null;
  counts: ReturnType<typeof attendanceCounts>;
  entries: MatchAttendanceEntryDto[];
};

@Injectable()
export class MatchAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async listAttendance(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    await this.ensureAttendanceRows(match);
    return this.buildListDto(match, defaults);
  }

  async patchPlayerAttendance(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    playerId: string,
    dto: UpdateAttendanceDto,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    this.assertListOpenForEdits(match, true);
    await this.ensureAttendanceRows(match);
    await this.applyStatusForPlayer(match.id, playerId, dto.status, defaults);
    const refreshed = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });
    return this.buildListDto(refreshed, defaults);
  }

  async selfAttendance(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    dto: SelfAttendanceDto,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    if (match.presenceMode !== 'SELF_CONFIRM') {
      throw new ForbiddenException(
        'Presença nesta partida é fechada pelo organizador.',
      );
    }
    this.assertListOpenForEdits(match, false);
    const player = await this.prisma.player.findFirst({
      where: { peladaId, userId: user.id },
    });
    if (!player) {
      throw new NotFoundException(
        'Nenhum jogador do elenco vinculado à sua conta.',
      );
    }
    await this.ensureAttendanceRows(match);
    const status: AttendanceStatus =
      dto.action === 'confirm' ? 'CONFIRMED' : 'DECLINED';
    await this.applyStatusForPlayer(match.id, player.id, status, defaults);
    const refreshed = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });
    return this.buildListDto(refreshed, defaults);
  }

  async requestGuest(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    dto: GuestAttendanceRequestDto,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    this.assertListOpenForEdits(match, false);
    await this.ensureAttendanceRows(match);
    const name = dto.displayName.trim();
    const guestPlayer = await this.prisma.player.create({
      data: {
        peladaId,
        displayName: name,
        position: 'Convidado',
        rating: 5,
        tags: [],
      },
    });
    await this.prisma.matchAttendance.create({
      data: {
        matchId: match.id,
        playerId: guestPlayer.id,
        status: 'PENDING',
        isGuest: true,
        guestName: name,
      },
    });
    return this.buildListDto(match, defaults);
  }

  async approveGuest(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    playerId: string,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    this.assertListOpenForEdits(match, true);
    const row = await this.prisma.matchAttendance.findUnique({
      where: { matchId_playerId: { matchId, playerId } },
    });
    if (!row?.isGuest) {
      throw new NotFoundException('Convidado não encontrado nesta partida.');
    }
    await this.applyStatusForPlayer(match.id, playerId, 'CONFIRMED', defaults);
    const refreshed = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });
    return this.buildListDto(refreshed, defaults);
  }

  async declineGuest(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    playerId: string,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    const row = await this.prisma.matchAttendance.findUnique({
      where: { matchId_playerId: { matchId, playerId } },
    });
    if (!row?.isGuest) {
      throw new NotFoundException('Convidado não encontrado nesta partida.');
    }
    await this.applyStatusForPlayer(match.id, playerId, 'DECLINED', defaults);
    const refreshed = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });
    return this.buildListDto(refreshed, defaults);
  }

  async closeList(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    if (match.status === 'LIST_CLOSED') {
      return this.buildListDto(match, defaults);
    }
    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Lista só pode ser fechada enquanto a partida está agendada.',
      );
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'LIST_CLOSED', listClosedAt: new Date() },
    });
    return this.buildListDto(updated, defaults);
  }

  async reopenList(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchAttendanceListDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatchMember(
      peladaId,
      matchId,
      user.id,
    );
    if (match.status === 'SCHEDULED') {
      return this.buildListDto(match, defaults);
    }
    if (match.status !== 'LIST_CLOSED') {
      throw new BadRequestException(
        'Lista só pode ser reaberta antes do sorteio ou da partida ir a campo.',
      );
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'SCHEDULED', listClosedAt: null },
    });
    return this.buildListDto(updated, defaults);
  }

  private async applyStatusForPlayer(
    matchId: string,
    playerId: string,
    requested: AttendanceStatus,
    defaults: PeladaRules,
  ): Promise<void> {
    // Lock a linha da partida (SELECT ... FOR UPDATE) para serializar confirmações
    // concorrentes: sem isso, duas confirmações simultâneas liam a mesma capacidade
    // e contagem de fila, e ambas "passavam", furando o limite de vagas (C3).
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM matches WHERE id = ${matchId} FOR UPDATE`;
      const match = await tx.match.findUniqueOrThrow({
        where: { id: matchId },
      });
      const capacity = this.capacityForMatch(match, defaults);
      const rows = await this.loadRowInputs(tx, matchId);
      if (!rows.some((r) => r.playerId === playerId)) {
        throw new NotFoundException(
          'Jogador não está na lista desta partida.',
        );
      }
      const nextRows = applyAttendanceStatusChange(
        rows,
        playerId,
        requested,
        capacity,
      );
      await this.persistRowInputs(tx, matchId, rows, nextRows);
    });
  }

  private async loadRowInputs(
    tx: Prisma.TransactionClient,
    matchId: string,
  ): Promise<AttendanceRowInput[]> {
    const list = await tx.matchAttendance.findMany({
      where: { matchId },
    });
    return list.map((a) => ({
      playerId: a.playerId,
      status: a.status,
      queuePosition: a.queuePosition,
      isGuest: a.isGuest,
    }));
  }

  private async persistRowInputs(
    tx: Prisma.TransactionClient,
    matchId: string,
    before: AttendanceRowInput[],
    after: AttendanceRowInput[],
  ): Promise<void> {
    const beforeMap = new Map(before.map((r) => [r.playerId, r]));
    for (const row of after) {
      const prev = beforeMap.get(row.playerId);
      if (
        prev &&
        prev.status === row.status &&
        prev.queuePosition === row.queuePosition
      ) {
        continue;
      }
      await tx.matchAttendance.update({
        where: { matchId_playerId: { matchId, playerId: row.playerId } },
        data: {
          status: row.status,
          queuePosition: row.queuePosition,
        },
      });
    }
  }

  private async ensureAttendanceRows(match: Match): Promise<void> {
    const players = await this.prisma.player.findMany({
      where: { peladaId: match.peladaId },
      orderBy: { createdAt: 'asc' },
    });
    const existing = await this.prisma.matchAttendance.findMany({
      where: { matchId: match.id },
    });
    const existingIds = new Set(existing.map((e) => e.playerId));
    const missing = players.filter((p) => !existingIds.has(p.id));
    if (missing.length === 0) {
      return;
    }
    await this.prisma.matchAttendance.createMany({
      data: missing.map((p) => ({
        matchId: match.id,
        playerId: p.id,
        status: 'PENDING' as AttendanceStatus,
      })),
      skipDuplicates: true,
    });
  }

  private capacityForMatch(match: Match, defaults: PeladaRules): number {
    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as MatchRulesOverrideJson | null,
    );
    return computeMatchCapacity(effective);
  }

  private async buildListDto(
    match: Match,
    defaults: PeladaRules,
  ): Promise<MatchAttendanceListDto> {
    const capacity = this.capacityForMatch(match, defaults);
    const attendances = await this.prisma.matchAttendance.findMany({
      where: { matchId: match.id },
      include: { player: true },
      orderBy: [{ status: 'asc' }, { queuePosition: 'asc' }, { createdAt: 'asc' }],
    });
    const rowInputs: AttendanceRowInput[] = attendances.map((a) => ({
      playerId: a.playerId,
      status: a.status,
      queuePosition: a.queuePosition,
      isGuest: a.isGuest,
    }));
    const entries: MatchAttendanceEntryDto[] = attendances.map((a) => ({
      playerId: a.playerId,
      displayName: a.isGuest
        ? (a.guestName?.trim() || a.player.displayName)
        : a.player.displayName,
      status: a.status,
      queuePosition: a.queuePosition,
      isGuest: a.isGuest,
      guestName: a.guestName,
      isGoalkeeper: a.player.isGoalkeeper,
      position: a.player.position,
      rating: a.player.rating,
    }));
    return {
      matchId: match.id,
      peladaId: match.peladaId,
      listClosed: match.status === 'LIST_CLOSED',
      capacity,
      presenceMode: match.presenceMode,
      counts: attendanceCounts(rowInputs),
      entries,
    };
  }

  private assertListOpenForEdits(match: Match, isOrganizador: boolean): void {
    if (match.status !== 'LIST_CLOSED') {
      return;
    }
    if (!isOrganizador) {
      throw new ForbiddenException('Lista fechada para novas alterações.');
    }
    throw new BadRequestException(
      'Lista fechada. Reabra a lista para alterar presenças.',
    );
  }

  private async loadMatchMember(
    peladaId: string,
    matchId: string,
    userId: string,
  ): Promise<{ match: Match; defaults: PeladaRules }> {
    await this.assertMember(peladaId, userId);
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, peladaId },
    });
    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }
    const defaults = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!defaults) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }
    return { match, defaults };
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
      throw new ForbiddenException('Somente organizador executa esta ação.');
    }
  }
}
