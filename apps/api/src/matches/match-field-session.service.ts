import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DrawTeam, Match, MatchFieldSession, PeladaRules } from '@prisma/client';
import type { AuthUserPayload } from '../auth/auth-user';
import type { PatchMatchFieldSessionDto } from '../domain/dto/patch-match-field-session.dto';
import type { PostMatchFieldSessionDto } from '../domain/dto/post-match-field-session.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { mergeEffectiveMatchRules } from './match-rules.merge';
import {
  applyTimerAction,
  computeNextRoundSides,
  readFixedGkRotation,
  readRotationPolicy,
  snapshotElapsedMs,
  updateFixedGkMeta,
  type FieldRotationPolicy,
} from './match-field-rotation.logic';

export type FieldSessionTeamView = {
  sortOrder: number;
  drawTeamId: string;
  name: string;
  role: 'HOME' | 'AWAY' | 'REST';
};

export type MatchFieldSessionDto = {
  sessionId: string;
  matchId: string;
  rotationPolicy: FieldRotationPolicy;
  roundNumber: number;
  scoreHome: number;
  scoreAway: number;
  elapsedMs: number;
  timerRunning: boolean;
  timerRunningSince: string | null;
  finishedAt: string | null;
  teamsOnField: FieldSessionTeamView[];
  restingTeams: Array<{ sortOrder: number; drawTeamId: string; name: string }>;
  fixedGkMeta: Record<string, unknown>;
};

type DrawWithTeams = {
  id: string;
  teams: DrawTeam[];
};

@Injectable()
export class MatchFieldSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async getSession(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);
    const { draw } = await this.loadDrawContext(peladaId, matchId);
    const session = await this.prisma.matchFieldSession.findUnique({
      where: { matchId },
    });
    if (!session) {
      throw new NotFoundException('Sessão em campo ainda não iniciada.');
    }
    return this.toDto(session, draw.teams);
  }

  async startSession(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    body: PostMatchFieldSessionDto,
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatch(peladaId, matchId);
    const { draw, teamCount } = await this.loadDrawContext(peladaId, matchId);
    if (teamCount < 2) {
      throw new BadRequestException('É preciso sortear pelo menos 2 times.');
    }

    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as Record<string, unknown> | null,
    );
    const policy =
      body.rotationPolicy ??
      readRotationPolicy(effective.extra, match.rulesOverride);

    const existing = await this.prisma.matchFieldSession.findUnique({
      where: { matchId: match.id },
    });
    if (existing) {
      throw new ConflictException('Sessão em campo já iniciada.');
    }

    const sorted = [...draw.teams].sort((a, b) => a.sortOrder - b.sortOrder);
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.matchFieldSession.create({
        data: {
          matchId: match.id,
          rotationPolicy: policy,
          homeTeamSortOrder: sorted[0]!.sortOrder,
          awayTeamSortOrder: sorted[1]!.sortOrder,
          fixedGkMeta: this.initialGkMeta(
            effective.goalkeeperMode,
            effective.extra,
            sorted[0]!.sortOrder,
          ) as object,
        },
      });
      await tx.match.update({
        where: { id: match.id },
        data: { status: 'IN_PROGRESS' },
      });
      return created;
    });

    return this.toDto(session, draw.teams);
  }

  async patchSession(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    body: PatchMatchFieldSessionDto,
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { draw } = await this.loadDrawContext(peladaId, matchId);
    const session = await this.requireOpenSession(matchId);

    let goalHistory = this.parseGoalHistory(session.goalHistory);
    let scoreHome = session.scoreHome;
    let scoreAway = session.scoreAway;
    let elapsedMs = session.elapsedMs;
    let timerRunningSince = session.timerRunningSince;

    if (body.timer) {
      const next = applyTimerAction(
        elapsedMs,
        timerRunningSince,
        body.timer,
      );
      elapsedMs = next.elapsedMs;
      timerRunningSince = next.timerRunningSince;
    }

    if (body.addGoal === 'HOME') {
      scoreHome += 1;
      goalHistory = [...goalHistory, 'HOME'];
    } else if (body.addGoal === 'AWAY') {
      scoreAway += 1;
      goalHistory = [...goalHistory, 'AWAY'];
    } else if (body.undoGoal) {
      const last = goalHistory.pop();
      if (last === 'HOME') {
        scoreHome = Math.max(0, scoreHome - 1);
      } else if (last === 'AWAY') {
        scoreAway = Math.max(0, scoreAway - 1);
      }
    }

    if (
      !body.timer &&
      body.addGoal === undefined &&
      body.undoGoal === undefined
    ) {
      throw new BadRequestException('Nenhuma alteração informada.');
    }

    const updated = await this.prisma.matchFieldSession.update({
      where: { id: session.id },
      data: {
        scoreHome,
        scoreAway,
        elapsedMs,
        timerRunningSince,
        goalHistory,
      },
    });

    return this.toDto(updated, draw.teams);
  }

  async endRound(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatch(peladaId, matchId);
    const { draw, teamCount } = await this.loadDrawContext(peladaId, matchId);
    const session = await this.requireOpenSession(matchId);

    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as Record<string, unknown> | null,
    );
    const fixedGkRotation = readFixedGkRotation(effective.extra);

    const elapsedMs = snapshotElapsedMs(
      session.elapsedMs,
      session.timerRunningSince,
    );

    const next = computeNextRoundSides({
      policy: session.rotationPolicy as FieldRotationPolicy,
      teamCount,
      roundNumber: session.roundNumber,
      homeTeamSortOrder: session.homeTeamSortOrder,
      awayTeamSortOrder: session.awayTeamSortOrder,
      scoreHome: session.scoreHome,
      scoreAway: session.scoreAway,
    });

    const fixedGkMeta = updateFixedGkMeta(
      (session.fixedGkMeta ?? {}) as Record<string, unknown>,
      {
        goalkeeperMode: effective.goalkeeperMode,
        fixedGkRotation,
        homeTeamSortOrder: session.homeTeamSortOrder,
        awayTeamSortOrder: session.awayTeamSortOrder,
        scoreHome: session.scoreHome,
        scoreAway: session.scoreAway,
      },
    );

    const updated = await this.prisma.matchFieldSession.update({
      where: { id: session.id },
      data: {
        roundNumber: next.roundNumber,
        homeTeamSortOrder: next.homeTeamSortOrder,
        awayTeamSortOrder: next.awayTeamSortOrder,
        scoreHome: 0,
        scoreAway: 0,
        elapsedMs,
        timerRunningSince: null,
        goalHistory: [],
        fixedGkMeta: fixedGkMeta as object,
      },
    });

    return this.toDto(updated, draw.teams);
  }

  async finishSession(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { draw } = await this.loadDrawContext(peladaId, matchId);
    const session = await this.requireOpenSession(matchId);
    const now = new Date();
    const elapsedMs = snapshotElapsedMs(
      session.elapsedMs,
      session.timerRunningSince,
      now,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.matchFieldSession.update({
        where: { id: session.id },
        data: {
          elapsedMs,
          timerRunningSince: null,
          finishedAt: now,
        },
      });
      await tx.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED' },
      });
      return row;
    });

    return this.toDto(updated, draw.teams);
  }

  private toDto(
    session: MatchFieldSession,
    teams: DrawTeam[],
  ): MatchFieldSessionDto {
    const byOrder = new Map(teams.map((t) => [t.sortOrder, t]));
    const resting = teams
      .filter(
        (t) =>
          t.sortOrder !== session.homeTeamSortOrder &&
          t.sortOrder !== session.awayTeamSortOrder,
      )
      .map((t) => ({
        sortOrder: t.sortOrder,
        drawTeamId: t.id,
        name: t.name,
      }));

    const home = byOrder.get(session.homeTeamSortOrder);
    const away = byOrder.get(session.awayTeamSortOrder);
    if (!home || !away) {
      throw new BadRequestException('Times em campo inconsistentes com o sorteio.');
    }

    const elapsedMs = snapshotElapsedMs(
      session.elapsedMs,
      session.timerRunningSince,
    );

    return {
      sessionId: session.id,
      matchId: session.matchId,
      rotationPolicy: session.rotationPolicy as FieldRotationPolicy,
      roundNumber: session.roundNumber,
      scoreHome: session.scoreHome,
      scoreAway: session.scoreAway,
      elapsedMs,
      timerRunning: session.timerRunningSince !== null,
      timerRunningSince: session.timerRunningSince?.toISOString() ?? null,
      finishedAt: session.finishedAt?.toISOString() ?? null,
      teamsOnField: [
        {
          sortOrder: home.sortOrder,
          drawTeamId: home.id,
          name: home.name,
          role: 'HOME',
        },
        {
          sortOrder: away.sortOrder,
          drawTeamId: away.id,
          name: away.name,
          role: 'AWAY',
        },
      ],
      restingTeams: resting,
      fixedGkMeta: (session.fixedGkMeta ?? {}) as Record<string, unknown>,
    };
  }

  private initialGkMeta(
    goalkeeperMode: string,
    extra: Record<string, unknown>,
    homeSortOrder: number,
  ): Record<string, unknown> {
    if (goalkeeperMode !== 'FIXED_GLOBAL') {
      return {};
    }
    const rot = readFixedGkRotation(extra);
    if (rot === 'RESULT') {
      return { gkTeamSortOrder: homeSortOrder };
    }
    return {};
  }

  private parseGoalHistory(raw: unknown): Array<'HOME' | 'AWAY'> {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((x) => x === 'HOME' || x === 'AWAY') as Array<
      'HOME' | 'AWAY'
    >;
  }

  private async requireOpenSession(
    matchId: string,
  ): Promise<MatchFieldSession> {
    const session = await this.prisma.matchFieldSession.findUnique({
      where: { matchId },
    });
    if (!session) {
      throw new NotFoundException('Sessão em campo ainda não iniciada.');
    }
    if (session.finishedAt) {
      throw new BadRequestException('Partida já encerrada.');
    }
    return session;
  }

  private async loadDrawContext(
    peladaId: string,
    matchId: string,
  ): Promise<{ draw: DrawWithTeams; teamCount: number }> {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, peladaId },
    });
    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }
    const draw = await this.prisma.draw.findUnique({
      where: { matchId: match.id },
      include: { teams: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!draw || draw.teams.length < 2) {
      throw new BadRequestException('Sorteie os times antes de ir a campo.');
    }
    return { draw, teamCount: draw.teams.length };
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
      throw new ForbiddenException('Somente o organizador pode gerir o jogo em campo.');
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
