import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AttendanceStatus,
  Match,
  PeladaRules,
  Player,
} from '@prisma/client';
import {
  computeDrawBalanceMetrics,
  drawTeams,
  DrawValidationError,
  redrawDrawTeams,
  swapDrawPlayers,
  type DrawPlayerInput,
  type DrawTeamsResult,
} from '@pelada/core';
import type { AuthUserPayload } from '../auth/auth-user';
import type { PostMatchDrawDto } from '../domain/dto/post-match-draw.dto';
import type { PatchDrawSwapDto } from '../domain/dto/patch-draw-swap.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapGoalkeeperMode, parseDrawWeights } from './match-draw-map.logic';
import { mergeEffectiveMatchRules } from './match-rules.merge';
import type { MatchRulesOverrideJson } from './match-rules.merge';

const ATTENDING: AttendanceStatus[] = ['CONFIRMED', 'QUEUE'];

export type DrawPlayerSlotDto = {
  playerId: string;
  sortOrder: number;
};

export type DrawTeamResponseDto = {
  id: string;
  name: string;
  sortOrder: number;
  playerIds: string[];
  players: DrawPlayerSlotDto[];
};

export type DrawDetailResponseDto = {
  drawId: string;
  matchId: string;
  balanceScore: number | null;
  seed: string | null;
  metrics: {
    balanceScore: number;
    teamAverages: number[];
    maxAverageDiff: number;
    summaryText: string;
  };
  teams: DrawTeamResponseDto[];
};

@Injectable()
export class MatchDrawService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async getDraw(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<DrawDetailResponseDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);
    const { match, defaults } = await this.loadMatch(peladaId, matchId);

    const draw = await this.prisma.draw.findUnique({
      where: { matchId: match.id },
      include: {
        teams: {
          orderBy: { sortOrder: 'asc' },
          include: {
            players: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!draw) {
      throw new NotFoundException('Sorteio ainda não foi realizado.');
    }

    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as MatchRulesOverrideJson | null,
    );
    const weights = parseDrawWeights(effective.drawWeights);

    const allIds = draw.teams.flatMap((t) => t.players.map((p) => p.playerId));
    const players = await this.prisma.player.findMany({
      where: { id: { in: allIds } },
    });
    const corePlayers = players.map((p) => this.playerToDrawInput(p));
    const teamPlayerIds = [...draw.teams]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) =>
        [...t.players].sort((x, y) => x.sortOrder - y.sortOrder).map((x) => x.playerId),
      );
    const metrics = computeDrawBalanceMetrics(teamPlayerIds, corePlayers, weights);

    return this.toDto(draw, metrics);
  }

  async postDraw(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    dto: PostMatchDrawDto,
  ): Promise<DrawDetailResponseDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatch(peladaId, matchId);

    if (match.status !== 'LIST_CLOSED') {
      throw new BadRequestException('Feche a lista de presença antes de sortear.');
    }

    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as MatchRulesOverrideJson | null,
    );

    const confirmedPlayers = await this.loadConfirmedPlayers(match);
    const drawInput = this.buildDrawInput(effective, match, confirmedPlayers, dto);

    let result: DrawTeamsResult;
    try {
      const pins = this.normalizePinnedByTeam(dto.pinnedByTeam);
      if (pins && Object.keys(pins).length > 0) {
        result = redrawDrawTeams({
          ...drawInput,
          pinnedByTeam: pins,
        });
      } else {
        result = drawTeams(drawInput);
      }
    } catch (e) {
      if (e instanceof DrawValidationError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    return this.persistDraw(matchId, result);
  }

  async patchSwap(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    dto: PatchDrawSwapDto,
  ): Promise<DrawDetailResponseDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatch(peladaId, matchId);

    if (match.status !== 'DRAWN') {
      throw new BadRequestException('Sorteio ainda não foi realizado nesta partida.');
    }

    const draw = await this.prisma.draw.findUnique({
      where: { matchId },
      include: {
        teams: {
          orderBy: { sortOrder: 'asc' },
          include: {
            players: {
              orderBy: { sortOrder: 'asc' },
              include: { player: true },
            },
          },
        },
      },
    });
    if (!draw) {
      throw new NotFoundException('Sorteio não encontrado.');
    }

    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as MatchRulesOverrideJson | null,
    );

    const playerIds = new Set<string>();
    for (const team of draw.teams) {
      for (const row of team.players) {
        playerIds.add(row.playerId);
      }
    }

    const players = await this.prisma.player.findMany({
      where: { id: { in: [...playerIds] } },
    });
    const corePlayers = players.map((p) => this.playerToDrawInput(p));

    const slots = draw.teams.map((t) => ({
      teamIndex: t.sortOrder,
      playerIds: t.players.map((x) => x.playerId),
    }));

    let swapped;
    try {
      swapped = swapDrawPlayers({
        players: corePlayers,
        teams: slots,
        playerAId: dto.playerAId,
        playerBId: dto.playerBId,
        goalkeepersMode: mapGoalkeeperMode(effective.goalkeeperMode),
        weights: parseDrawWeights(effective.drawWeights),
      });
    } catch (e) {
      if (e instanceof DrawValidationError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    const synthetic: DrawTeamsResult = {
      teams: swapped.teams.map((t) => ({
        teamIndex: t.teamIndex,
        playerIds: t.playerIds,
      })),
      metrics: swapped.metrics,
      seed: draw.seed != null && draw.seed !== '' ? Number(draw.seed) : 0,
    };

    return this.persistDraw(matchId, synthetic, draw.id);
  }

  private normalizePinnedByTeam(
    raw: Record<string, string[]> | undefined,
  ): Partial<Record<number, string[]>> | undefined {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    const out: Partial<Record<number, string[]>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0) {
        continue;
      }
      if (!Array.isArray(v)) {
        throw new BadRequestException(`pinnedByTeam[${k}] deve ser array de ids.`);
      }
      out[idx] = v.map((id) => String(id).trim()).filter(Boolean);
    }
    return Object.keys(out).length ? out : undefined;
  }

  private ratingToCore(player: Player): number {
    if (player.rating == null) {
      return 7;
    }
    const r = player.rating;
    if (r >= 0 && r <= 10) {
      return r;
    }
    if (r > 10 && r <= 100) {
      return r / 10;
    }
    return Math.max(0, Math.min(10, r));
  }

  private playerToDrawInput(player: Player): DrawPlayerInput {
    const attrs =
      player.attributes && typeof player.attributes === 'object' && !Array.isArray(player.attributes)
        ? (player.attributes as Record<string, unknown>)
        : {};
    const attrScore =
      typeof attrs.score === 'number'
        ? Math.max(0, Math.min(10, attrs.score))
        : typeof attrs.attributeScore === 'number'
          ? Math.max(0, Math.min(10, attrs.attributeScore))
          : undefined;

    return {
      id: player.id,
      rating: this.ratingToCore(player),
      isGoalkeeper: player.isGoalkeeper,
      ...(attrScore !== undefined ? { attributeScore: attrScore } : {}),
      ...(player.tags?.length ? { tags: [...player.tags] } : {}),
      ...(player.position?.trim() ? { position: player.position.trim() } : {}),
    };
  }

  private buildDrawInput(
    effective: ReturnType<typeof mergeEffectiveMatchRules>,
    match: Match,
    players: Player[],
    dto: PostMatchDrawDto,
  ) {
    const mode =
      dto.mode ??
      (typeof effective.drawWeights['mode'] === 'string' &&
      (effective.drawWeights['mode'] === 'BALANCED' || effective.drawWeights['mode'] === 'RANDOM')
        ? (effective.drawWeights['mode'] as 'BALANCED' | 'RANDOM')
        : 'BALANCED');

    const corePlayers = players.map((p) => this.playerToDrawInput(p));

    return {
      players: corePlayers,
      teamCount: effective.teamCount,
      mode,
      goalkeepersMode: mapGoalkeeperMode(effective.goalkeeperMode),
      weights: parseDrawWeights(effective.drawWeights),
      ...(dto.seed !== undefined ? { seed: dto.seed } : {}),
    };
  }

  private async loadConfirmedPlayers(match: Match): Promise<Player[]> {
    const rows = await this.prisma.matchAttendance.findMany({
      where: { matchId: match.id, status: { in: ATTENDING } },
      include: { player: true },
    });
    if (rows.length === 0) {
      throw new BadRequestException('Não há jogadores confirmados ou na fila para sortear.');
    }
    return rows.map((r) => r.player);
  }

  private async persistDraw(
    matchId: string,
    result: DrawTeamsResult,
    existingDrawId?: string,
  ): Promise<DrawDetailResponseDto> {
    const balance = Math.round(result.metrics.balanceScore);

    const saved = await this.prisma.$transaction(async (tx) => {
      let drawId: string;

      if (existingDrawId) {
        await tx.drawTeamPlayer.deleteMany({
          where: { team: { drawId: existingDrawId } },
        });
        await tx.drawTeam.deleteMany({ where: { drawId: existingDrawId } });
        await tx.draw.update({
          where: { id: existingDrawId },
          data: {
            balanceScore: balance,
            seed: String(result.seed),
          },
        });
        drawId = existingDrawId;
      } else {
        await tx.draw.deleteMany({ where: { matchId } });
        const created = await tx.draw.create({
          data: {
            matchId,
            balanceScore: balance,
            seed: String(result.seed),
          },
        });
        drawId = created.id;
      }

      for (const slot of result.teams) {
        const name = `Time ${String.fromCharCode(65 + slot.teamIndex)}`;
        const team = await tx.drawTeam.create({
          data: {
            drawId,
            name,
            sortOrder: slot.teamIndex,
          },
        });
        let order = 0;
        for (const pid of slot.playerIds) {
          await tx.drawTeamPlayer.create({
            data: {
              teamId: team.id,
              playerId: pid,
              sortOrder: order++,
            },
          });
        }
      }

      await tx.match.update({
        where: { id: matchId },
        data: { status: 'DRAWN' },
      });

      return tx.draw.findUniqueOrThrow({
        where: { id: drawId },
        include: {
          teams: {
            orderBy: { sortOrder: 'asc' },
            include: {
              players: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });
    });

    return this.toDto(saved, result.metrics);
  }

  private toDto(
    draw: {
      id: string;
      matchId: string;
      balanceScore: number | null;
      seed: string | null;
      teams: Array<{
        id: string;
        name: string;
        sortOrder: number;
        players: Array<{ playerId: string; sortOrder: number }>;
      }>;
    },
    metrics: DrawTeamsResult['metrics'],
  ): DrawDetailResponseDto {
    return {
      drawId: draw.id,
      matchId: draw.matchId,
      balanceScore: draw.balanceScore,
      seed: draw.seed,
      metrics: {
        balanceScore: metrics.balanceScore,
        teamAverages: metrics.teamAverages,
        maxAverageDiff: metrics.maxAverageDiff,
        summaryText: metrics.summaryText,
      },
      teams: draw.teams.map((t) => ({
        id: t.id,
        name: t.name,
        sortOrder: t.sortOrder,
        playerIds: t.players.map((p) => p.playerId),
        players: t.players.map((p) => ({
          playerId: p.playerId,
          sortOrder: p.sortOrder,
        })),
      })),
    };
  }

  private async loadMatch(
    peladaId: string,
    matchId: string,
  ): Promise<{ match: Match; defaults: PeladaRules }> {
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

  private async assertOrganizador(peladaId: string, userId: string): Promise<void> {
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Sem acesso a esta pelada.');
    }
    if (member.role !== 'ORGANIZADOR') {
      throw new ForbiddenException('Somente organizador pode sortear ou trocar jogadores.');
    }
  }

  private async assertMember(peladaId: string, userId: string): Promise<void> {
    const member = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Sem acesso a esta pelada.');
    }
  }
}
