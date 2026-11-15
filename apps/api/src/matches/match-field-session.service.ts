import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DrawTeam,
  Match,
  MatchFieldSession,
  PeladaRules,
  Prisma,
} from '@prisma/client';
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
  teams: Array<DrawTeam & { players: Array<{ playerId: string }> }>;
};

type GoalEntry = { side: 'HOME' | 'AWAY'; playerId?: string };

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
    const existing = await this.requireOpenSession(matchId);

    if (
      !body.timer &&
      body.addGoal === undefined &&
      body.undoGoal === undefined
    ) {
      throw new BadRequestException('Nenhuma alteração informada.');
    }

    if (body.addGoal && body.goalPlayerId) {
      this.assertPlayerOnFieldSide(
        draw.teams,
        body.addGoal === 'HOME'
          ? existing.homeTeamSortOrder
          : existing.awayTeamSortOrder,
        body.goalPlayerId,
      );
    }

    // Lock a linha da sessão em campo (SELECT ... FOR UPDATE) para que gols/timer
    // concorrentes (dois toques rápidos, dois celulares) sejam serializados em vez
    // de se perderem num read-modify-write sem controle (C4).
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM match_field_sessions WHERE id = ${existing.id} FOR UPDATE`;
      const session = await tx.matchFieldSession.findUniqueOrThrow({
        where: { id: existing.id },
      });
      if (session.finishedAt) {
        throw new BadRequestException('Partida já encerrada.');
      }

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
        goalHistory = [
          ...goalHistory,
          { side: 'HOME', playerId: body.goalPlayerId },
        ];
      } else if (body.addGoal === 'AWAY') {
        scoreAway += 1;
        goalHistory = [
          ...goalHistory,
          { side: 'AWAY', playerId: body.goalPlayerId },
        ];
      } else if (body.undoGoal) {
        const last = goalHistory.pop();
        if (last?.side === 'HOME') {
          scoreHome = Math.max(0, scoreHome - 1);
        } else if (last?.side === 'AWAY') {
          scoreAway = Math.max(0, scoreAway - 1);
        }
      }

      return tx.matchFieldSession.update({
        where: { id: session.id },
        data: {
          scoreHome,
          scoreAway,
          elapsedMs,
          timerRunningSince,
          goalHistory,
        },
      });
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

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.persistRoundHistory(tx, session, draw.teams, elapsedMs);
      return tx.matchFieldSession.update({
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
      await this.persistRoundHistory(tx, session, draw.teams, elapsedMs);
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

  /** Aceita o formato antigo (`'HOME'|'AWAY'`) pra não quebrar sessões já em campo. */
  private parseGoalHistory(raw: unknown): GoalEntry[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry): GoalEntry | null => {
        if (entry === 'HOME' || entry === 'AWAY') {
          return { side: entry };
        }
        if (
          entry &&
          typeof entry === 'object' &&
          (entry as { side?: unknown }).side &&
          ((entry as { side: unknown }).side === 'HOME' ||
            (entry as { side: unknown }).side === 'AWAY')
        ) {
          const e = entry as { side: 'HOME' | 'AWAY'; playerId?: unknown };
          return {
            side: e.side,
            playerId: typeof e.playerId === 'string' ? e.playerId : undefined,
          };
        }
        return null;
      })
      .filter((e): e is GoalEntry => e !== null);
  }

  /** Grava a rodada corrente em `MatchFieldRound` antes do placar ser zerado/encerrado. */
  private async persistRoundHistory(
    tx: Prisma.TransactionClient,
    session: MatchFieldSession,
    teams: DrawWithTeams['teams'],
    durationMs: number,
  ): Promise<void> {
    const home = teams.find((t) => t.sortOrder === session.homeTeamSortOrder);
    const away = teams.find((t) => t.sortOrder === session.awayTeamSortOrder);
    if (!home || !away) {
      throw new BadRequestException('Times em campo inconsistentes com o sorteio.');
    }
    await tx.matchFieldRound.create({
      data: {
        matchId: session.matchId,
        sessionId: session.id,
        roundNumber: session.roundNumber,
        homeDrawTeamId: home.id,
        awayDrawTeamId: away.id,
        scoreHome: session.scoreHome,
        scoreAway: session.scoreAway,
        goals: this.parseGoalHistory(session.goalHistory) as object,
        durationMs,
      },
    });
  }

  private assertPlayerOnFieldSide(
    teams: DrawWithTeams['teams'],
    sideSortOrder: number,
    playerId: string,
  ): void {
    const team = teams.find((t) => t.sortOrder === sideSortOrder);
    if (!team || !team.players.some((p) => p.playerId === playerId)) {
      throw new BadRequestException(
        'Jogador informado não está no time em campo desse lado.',
      );
    }
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
      include: {
        teams: {
          orderBy: { sortOrder: 'asc' },
          include: { players: { select: { playerId: true } } },
        },
      },
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
