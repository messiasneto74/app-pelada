import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUserPayload } from '../auth/auth-user';
import { CreateMatchDto } from '../domain/dto/create-match.dto';
import { PatchMatchRulesOverrideDto } from '../domain/dto/patch-match-rules-override.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildInitialMatchRulesOverride } from './match-create.logic';
import {
  mergeEffectiveMatchRules,
  mergeOverridePatch,
  type MatchRulesOverrideJson,
} from './match-rules.merge';

export type MatchRulesView = {
  matchId: string;
  peladaId: string;
  rulesOverride: MatchRulesOverrideJson | null;
  defaultRules: Record<string, unknown>;
  effectiveRules: Record<string, unknown>;
};

export type CreatedMatchResponse = {
  id: string;
  peladaId: string;
  scheduledAt: string;
  location: string | null;
  notes: string | null;
  presenceMode: string | null;
  status: string;
};

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async createMatch(
    auth: AuthUserPayload,
    peladaId: string,
    dto: CreateMatchDto,
  ): Promise<CreatedMatchResponse> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);

    const defaults = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });
    if (!defaults) {
      throw new NotFoundException('Regras da pelada não encontradas.');
    }

    const rulesOverride = buildInitialMatchRulesOverride(
      defaults,
      dto.rulesOverride ?? null,
    );
    mergeEffectiveMatchRules(defaults, rulesOverride);

    const match = await this.prisma.match.create({
      data: {
        peladaId,
        scheduledAt: dto.scheduledAt,
        location: dto.location?.trim() || null,
        notes: dto.notes?.trim() || null,
        presenceMode: dto.presenceMode ?? defaults.presenceMode,
        rulesOverride: rulesOverride as Prisma.InputJsonValue,
        status: 'SCHEDULED',
      },
    });

    return {
      id: match.id,
      peladaId: match.peladaId,
      scheduledAt: match.scheduledAt.toISOString(),
      location: match.location,
      notes: match.notes,
      presenceMode: match.presenceMode,
      status: match.status,
    };
  }

  async getMatchRules(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchRulesView> {
    const user = await this.meService.getOrCreateUser(auth);
    const { match, defaults } = await this.loadMatchWithDefaults(
      peladaId,
      matchId,
      user.id,
    );
    return this.toView(match, defaults);
  }

  async patchMatchRulesOverride(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    dto: PatchMatchRulesOverrideDto,
  ): Promise<MatchRulesView> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatchWithDefaults(
      peladaId,
      matchId,
      user.id,
    );

    const patch: MatchRulesOverrideJson = {
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
      ...(dto.drawWeights !== undefined && { drawWeights: dto.drawWeights }),
      ...(dto.extra !== undefined && { extra: dto.extra }),
    };

    const nextOverride = mergeOverridePatch(
      match.rulesOverride as MatchRulesOverrideJson | null,
      patch,
    );
    mergeEffectiveMatchRules(defaults, nextOverride);

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        rulesOverride: nextOverride as Prisma.InputJsonValue,
      },
    });

    return this.toView(updated, defaults);
  }

  private async loadMatchWithDefaults(
    peladaId: string,
    matchId: string,
    userId: string,
  ) {
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
      throw new NotFoundException('Regras padrão da pelada não encontradas.');
    }

    return { match, defaults };
  }

  private toView(
    match: { id: string; peladaId: string; rulesOverride: unknown },
    defaults: Parameters<typeof mergeEffectiveMatchRules>[0],
  ): MatchRulesView {
    const override =
      match.rulesOverride && typeof match.rulesOverride === 'object'
        ? (match.rulesOverride as MatchRulesOverrideJson)
        : null;
    const effective = mergeEffectiveMatchRules(defaults, override);
    return {
      matchId: match.id,
      peladaId: match.peladaId,
      rulesOverride: override,
      defaultRules: {
        playersPerTeam: defaults.playersPerTeam,
        teamCount: defaults.teamCount,
        modality: defaults.modality,
        goalkeeperMode: defaults.goalkeeperMode,
        presenceMode: defaults.presenceMode,
        capacity: defaults.capacity,
        allowPlayerSelfEdit: defaults.allowPlayerSelfEdit,
        fixedListOnly: defaults.fixedListOnly,
        drawWeights: defaults.drawWeights,
        extra: defaults.extra,
      },
      effectiveRules: effective,
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
      throw new ForbiddenException('Somente organizador altera exceção de regras.');
    }
  }
}
