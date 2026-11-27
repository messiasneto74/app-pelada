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
import type { PlayerCrossDaySummaryQueryDto } from '../domain/dto/player-cross-day-summary-query.dto';
import type { PostMatchFieldSessionDto } from '../domain/dto/post-match-field-session.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { mergeEffectiveMatchRules } from './match-rules.merge';
import {
  readSummaryTemplate,
  renderSummaryTemplate,
} from './match-summary-template.logic';
import {
  applyTimerAction,
  computeNextRoundSides,
  readTieBreakRule,
  resolveTie,
  roundOutcome,
  type TieBreakRule,
  type TieChoiceMethod,
  type TieSide,
  readFixedGkRotation,
  capRoundClock,
  readRotationPolicy,
  readRoundLimitMs,
  snapshotElapsedMs,
  wasRoundPlayed,
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
  /** Issue #229 — tempo da rodada atual (zera a cada rodada, para no limite). */
  roundElapsedMs: number;
  /** Issue #229 — tempo de cada partida definido nas Regras. */
  roundLimitMs: number;
  /** Issue #229 — a rodada chegou no tempo definido. */
  timeUp: boolean;
  timerRunning: boolean;
  timerRunningSince: string | null;
  finishedAt: string | null;
  teamsOnField: FieldSessionTeamView[];
  restingTeams: Array<{ sortOrder: number; drawTeamId: string; name: string }>;
  fixedGkMeta: Record<string, unknown>;
  /** Issue #227 — critério de desempate DESTA partida (null = empate é empate). */
  tieBreak: TieBreakRule | null;
};

type DrawWithTeams = {
  id: string;
  teams: Array<DrawTeam & { players: Array<{ playerId: string }> }>;
};

type GoalEntry = { side: 'HOME' | 'AWAY'; playerId?: string };

export type MatchDaySummaryDto = {
  matchId: string;
  rounds: number;
  teams: Array<{
    drawTeamId: string;
    name: string;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
  topScorer: { playerId: string; displayName: string; goals: number } | null;
  biggestWin: {
    winnerDrawTeamId: string;
    winnerName: string;
    loserDrawTeamId: string;
    loserName: string;
    scoreWinner: number;
    scoreLoser: number;
    margin: number;
  } | null;
  mostLosses: { drawTeamId: string; name: string; losses: number } | null;
  /** Texto do resumo renderizado a partir do template da pelada (livre, editável pelo organizador). */
  text: string;
};

/**
 * Resumo "entre dias": times são sorteados do zero em cada pelada, então a
 * comparação entre dias nunca é por time — só por jogador (épico #156).
 */
export type PlayerCrossDaySummaryDto = {
  peladaId: string;
  matches: number;
  since: string | null;
  until: string | null;
  players: Array<{
    playerId: string;
    displayName: string;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    goals: number;
  }>;
  topScorer: { playerId: string; displayName: string; goals: number } | null;
  mostWins: { playerId: string; displayName: string; wins: number } | null;
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
    return this.toDto(
      session,
      draw.teams,
      await this.roundLimitFor(peladaId, matchId),
      await this.tieRuleFor(peladaId, matchId),
    );
  }

  /** Resumo "do dia": agregação por time a partir das rodadas já persistidas desta partida. */
  async getDaySummary(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
  ): Promise<MatchDaySummaryDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const match = await this.prisma.match.findFirst({
      where: { id: matchId, peladaId },
    });
    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }

    const rounds = await this.prisma.matchFieldRound.findMany({
      where: { matchId },
      orderBy: { roundNumber: 'asc' },
    });

    const draw = await this.prisma.draw.findUnique({
      where: { matchId },
      include: { teams: true },
    });
    const teamNameById = new Map(
      (draw?.teams ?? []).map((t) => [t.id, t.name]),
    );

    type TeamAgg = {
      drawTeamId: string;
      name: string;
      played: number;
      wins: number;
      losses: number;
      draws: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    const teamAgg = new Map<string, TeamAgg>();
    const ensureTeam = (drawTeamId: string): TeamAgg => {
      let agg = teamAgg.get(drawTeamId);
      if (!agg) {
        agg = {
          drawTeamId,
          name: teamNameById.get(drawTeamId) ?? drawTeamId,
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        };
        teamAgg.set(drawTeamId, agg);
      }
      return agg;
    };

    const goalsByPlayer = new Map<string, number>();
    let biggestWin: MatchDaySummaryDto['biggestWin'] = null;

    for (const round of rounds) {
      const home = ensureTeam(round.homeDrawTeamId);
      const away = ensureTeam(round.awayDrawTeamId);
      home.played += 1;
      away.played += 1;
      home.goalsFor += round.scoreHome;
      home.goalsAgainst += round.scoreAway;
      away.goalsFor += round.scoreAway;
      away.goalsAgainst += round.scoreHome;

      // Issue #227 — empate decidido (par ou ímpar, pênaltis…) conta como vitória.
      const outcome = roundOutcome(round);
      if (outcome === 'HOME') {
        home.wins += 1;
        away.losses += 1;
      } else if (outcome === 'AWAY') {
        away.wins += 1;
        home.losses += 1;
      } else {
        home.draws += 1;
        away.draws += 1;
      }

      const margin = Math.abs(round.scoreHome - round.scoreAway);
      if (margin > 0 && (!biggestWin || margin > biggestWin.margin)) {
        const winnerIsHome = round.scoreHome > round.scoreAway;
        biggestWin = {
          winnerDrawTeamId: winnerIsHome ? home.drawTeamId : away.drawTeamId,
          winnerName: winnerIsHome ? home.name : away.name,
          loserDrawTeamId: winnerIsHome ? away.drawTeamId : home.drawTeamId,
          loserName: winnerIsHome ? away.name : home.name,
          scoreWinner: winnerIsHome ? round.scoreHome : round.scoreAway,
          scoreLoser: winnerIsHome ? round.scoreAway : round.scoreHome,
          margin,
        };
      }

      for (const goal of this.parseGoalHistory(round.goals)) {
        if (goal.playerId) {
          goalsByPlayer.set(
            goal.playerId,
            (goalsByPlayer.get(goal.playerId) ?? 0) + 1,
          );
        }
      }
    }

    let topScorer: MatchDaySummaryDto['topScorer'] = null;
    for (const [playerId, goals] of goalsByPlayer) {
      if (!topScorer || goals > topScorer.goals) {
        topScorer = { playerId, displayName: playerId, goals };
      }
    }
    if (topScorer) {
      const player = await this.prisma.player.findUnique({
        where: { id: topScorer.playerId },
        select: { displayName: true },
      });
      topScorer = { ...topScorer, displayName: player?.displayName ?? topScorer.playerId };
    }

    let mostLosses: MatchDaySummaryDto['mostLosses'] = null;
    for (const agg of teamAgg.values()) {
      if (agg.losses > 0 && (!mostLosses || agg.losses > mostLosses.losses)) {
        mostLosses = { drawTeamId: agg.drawTeamId, name: agg.name, losses: agg.losses };
      }
    }

    const rules = await this.prisma.peladaRules.findUnique({
      where: { peladaId },
    });

    const summary: MatchDaySummaryDto = {
      matchId,
      rounds: rounds.length,
      teams: Array.from(teamAgg.values()),
      topScorer,
      biggestWin,
      mostLosses,
      text: '',
    };
    summary.text = renderSummaryTemplate(
      readSummaryTemplate(rules?.extra),
      summary,
    );
    return summary;
  }

  /**
   * Resumo "entre dias" (uma pelada, intervalo opcional): agregação só por
   * jogador. Times são sorteados do zero em cada dia, então não são
   * entidades estáveis entre peladas — a comparação não pode ser por time.
   */
  async getPlayerCrossDaySummary(
    auth: AuthUserPayload,
    peladaId: string,
    query: PlayerCrossDaySummaryQueryDto,
  ): Promise<PlayerCrossDaySummaryDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertMember(peladaId, user.id);

    const since = query.since ?? null;
    const until = query.until ?? null;

    const matches = await this.prisma.match.findMany({
      where: {
        peladaId,
        ...((since || until) && {
          scheduledAt: {
            ...(since && { gte: new Date(since) }),
            ...(until && { lte: new Date(until) }),
          },
        }),
      },
      select: { id: true },
    });
    const matchIds = matches.map((m) => m.id);
    if (matchIds.length === 0) {
      return {
        peladaId,
        matches: 0,
        since,
        until,
        players: [],
        topScorer: null,
        mostWins: null,
      };
    }

    const rounds = await this.prisma.matchFieldRound.findMany({
      where: { matchId: { in: matchIds } },
    });

    const teamIds = new Set<string>();
    for (const round of rounds) {
      teamIds.add(round.homeDrawTeamId);
      teamIds.add(round.awayDrawTeamId);
    }
    const teamPlayers = await this.prisma.drawTeamPlayer.findMany({
      where: { teamId: { in: Array.from(teamIds) } },
      select: { teamId: true, playerId: true },
    });
    const playersByTeam = new Map<string, string[]>();
    for (const tp of teamPlayers) {
      const list = playersByTeam.get(tp.teamId) ?? [];
      list.push(tp.playerId);
      playersByTeam.set(tp.teamId, list);
    }

    type PlayerAgg = {
      playerId: string;
      played: number;
      wins: number;
      losses: number;
      draws: number;
      goals: number;
    };
    const agg = new Map<string, PlayerAgg>();
    const ensurePlayer = (playerId: string): PlayerAgg => {
      let a = agg.get(playerId);
      if (!a) {
        a = { playerId, played: 0, wins: 0, losses: 0, draws: 0, goals: 0 };
        agg.set(playerId, a);
      }
      return a;
    };

    const distinctMatchIds = new Set<string>();
    for (const round of rounds) {
      distinctMatchIds.add(round.matchId);
      const homePlayers = playersByTeam.get(round.homeDrawTeamId) ?? [];
      const awayPlayers = playersByTeam.get(round.awayDrawTeamId) ?? [];

      // Issue #227 — empate decidido conta como vitória/derrota.
      const outcome = roundOutcome(round);

      for (const playerId of homePlayers) {
        const a = ensurePlayer(playerId);
        a.played += 1;
        if (outcome === 'HOME') a.wins += 1;
        else if (outcome === 'AWAY') a.losses += 1;
        else a.draws += 1;
      }
      for (const playerId of awayPlayers) {
        const a = ensurePlayer(playerId);
        a.played += 1;
        if (outcome === 'AWAY') a.wins += 1;
        else if (outcome === 'HOME') a.losses += 1;
        else a.draws += 1;
      }

      for (const goal of this.parseGoalHistory(round.goals)) {
        if (goal.playerId) {
          ensurePlayer(goal.playerId).goals += 1;
        }
      }
    }

    const playerRows = await this.prisma.player.findMany({
      where: { id: { in: Array.from(agg.keys()) } },
      select: { id: true, displayName: true },
    });
    const nameById = new Map(playerRows.map((p) => [p.id, p.displayName]));

    const players = Array.from(agg.values())
      .map((a) => ({ ...a, displayName: nameById.get(a.playerId) ?? a.playerId }))
      .sort((a, b) => b.goals - a.goals || b.wins - a.wins);

    let topScorer: PlayerCrossDaySummaryDto['topScorer'] = null;
    let mostWins: PlayerCrossDaySummaryDto['mostWins'] = null;
    for (const p of players) {
      if (p.goals > 0 && (!topScorer || p.goals > topScorer.goals)) {
        topScorer = { playerId: p.playerId, displayName: p.displayName, goals: p.goals };
      }
      if (p.wins > 0 && (!mostWins || p.wins > mostWins.wins)) {
        mostWins = { playerId: p.playerId, displayName: p.displayName, wins: p.wins };
      }
    }

    return {
      peladaId,
      matches: distinctMatchIds.size,
      since,
      until,
      players,
      topScorer,
      mostWins,
    };
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

    return this.toDto(
      session,
      draw.teams,
      readRoundLimitMs(effective.extra),
      readTieBreakRule(effective.extra),
    );
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
    const limitMs = await this.roundLimitFor(peladaId, matchId);
    const tieRule = await this.tieRuleFor(peladaId, matchId);

    if (
      !body.timer &&
      body.addGoal === undefined &&
      body.undoGoal === undefined
    ) {
      throw new BadRequestException('Nenhuma alteração informada.');
    }

    // Lock a linha da sessão em campo (SELECT ... FOR UPDATE) para que gols/timer
    // concorrentes (dois toques rápidos, dois celulares) sejam serializados em vez
    // de se perderem num read-modify-write sem controle (C4). A validação do
    // goleador também precisa rodar sob esse lock, lendo os times em campo
    // atuais — um end-round concorrente pode trocar quem está em campo entre
    // a validação e a gravação (achado B1 do Cursor na PR #158).
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM match_field_sessions WHERE id = ${existing.id} FOR UPDATE`;
      const session = await tx.matchFieldSession.findUniqueOrThrow({
        where: { id: existing.id },
      });
      if (session.finishedAt) {
        throw new BadRequestException('Partida já encerrada.');
      }

      if (body.addGoal && body.goalPlayerId) {
        this.assertPlayerOnFieldSide(
          draw.teams,
          body.addGoal === 'HOME'
            ? session.homeTeamSortOrder
            : session.awayTeamSortOrder,
          body.goalPlayerId,
        );
      }

      let goalHistory = this.parseGoalHistory(session.goalHistory);
      let scoreHome = session.scoreHome;
      let scoreAway = session.scoreAway;
      let elapsedMs = session.elapsedMs;
      let timerRunningSince = session.timerRunningSince;

      if (body.timer) {
        const clock = capRoundClock(
          snapshotElapsedMs(elapsedMs, timerRunningSince),
          session.roundStartedElapsedMs,
          limitMs,
        );
        if (body.timer === 'start' && clock.timeUp) {
          throw new BadRequestException(
            'O tempo desta partida acabou. Encerre a rodada pra começar a próxima.',
          );
        }
        const next = applyTimerAction(
          elapsedMs,
          timerRunningSince,
          body.timer,
        );
        // Issue #229 — ao pausar, o relógio para no tempo da rodada.
        elapsedMs =
          body.timer === 'pause'
            ? capRoundClock(next.elapsedMs, session.roundStartedElapsedMs, limitMs).cumulativeMs
            : next.elapsedMs;
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

    return this.toDto(updated, draw.teams, limitMs, tieRule);
  }

  async endRound(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    tieChoice: { winner?: TieSide | null; method?: TieChoiceMethod | null } = {},
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { match, defaults } = await this.loadMatch(peladaId, matchId);
    const { draw, teamCount } = await this.loadDrawContext(peladaId, matchId);
    const existing = await this.requireOpenSession(matchId);

    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as Record<string, unknown> | null,
    );
    const fixedGkRotation = readFixedGkRotation(effective.extra);

    // Lock + relê a sessão sob FOR UPDATE: um gol concorrente entre o load
    // acima e este ponto não pode ser perdido do histórico da rodada que
    // está sendo encerrada (achado B1 do Cursor na PR #158).
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM match_field_sessions WHERE id = ${existing.id} FOR UPDATE`;
      const session = await tx.matchFieldSession.findUniqueOrThrow({
        where: { id: existing.id },
      });
      if (session.finishedAt) {
        throw new BadRequestException('Partida já encerrada.');
      }

      const rawElapsedMs = snapshotElapsedMs(
        session.elapsedMs,
        session.timerRunningSince,
      );
      // Issue #229 — a rodada conta só até o tempo definido nas Regras.
      const elapsedMs = capRoundClock(
        rawElapsedMs,
        session.roundStartedElapsedMs,
        readRoundLimitMs(effective.extra),
      ).cumulativeMs;

      // Issue #227 — grava a rodada (com o desempate) antes de definir a próxima.
      const tieWinner = await this.persistRoundHistory(tx, session, draw.teams, elapsedMs, {
        tie: { rule: readTieBreakRule(effective.extra), chosen: tieChoice },
      });
      const tieWinnerSortOrder =
        tieWinner === 'HOME'
          ? session.homeTeamSortOrder
          : tieWinner === 'AWAY'
            ? session.awayTeamSortOrder
            : null;

      const next = computeNextRoundSides({
        policy: session.rotationPolicy as FieldRotationPolicy,
        teamCount,
        roundNumber: session.roundNumber,
        homeTeamSortOrder: session.homeTeamSortOrder,
        awayTeamSortOrder: session.awayTeamSortOrder,
        scoreHome: session.scoreHome,
        scoreAway: session.scoreAway,
        tieWinnerSortOrder,
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
          tieWinnerSortOrder,
        },
      );

      return tx.matchFieldSession.update({
        where: { id: session.id },
        data: {
          roundNumber: next.roundNumber,
          homeTeamSortOrder: next.homeTeamSortOrder,
          awayTeamSortOrder: next.awayTeamSortOrder,
          scoreHome: 0,
          scoreAway: 0,
          elapsedMs,
          // Issue #229 — a próxima rodada começa do zero no cronômetro.
          roundStartedElapsedMs: elapsedMs,
          timerRunningSince: null,
          goalHistory: [],
          fixedGkMeta: fixedGkMeta as object,
        },
      });
    });

    return this.toDto(
      updated,
      draw.teams,
      readRoundLimitMs(effective.extra),
      readTieBreakRule(effective.extra),
    );
  }

  async finishSession(
    auth: AuthUserPayload,
    peladaId: string,
    matchId: string,
    tieChoice: { winner?: TieSide | null; method?: TieChoiceMethod | null } = {},
  ): Promise<MatchFieldSessionDto> {
    const user = await this.meService.getOrCreateUser(auth);
    await this.assertOrganizador(peladaId, user.id);
    const { draw } = await this.loadDrawContext(peladaId, matchId);
    const existing = await this.requireOpenSession(matchId);
    const limitMs = await this.roundLimitFor(peladaId, matchId);
    const tieRule = await this.tieRuleFor(peladaId, matchId);
    const now = new Date();

    // Lock + relê sob FOR UPDATE, mesmo motivo do endRound: um gol
    // concorrente não pode ficar de fora da última rodada persistida.
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM match_field_sessions WHERE id = ${existing.id} FOR UPDATE`;
      const session = await tx.matchFieldSession.findUniqueOrThrow({
        where: { id: existing.id },
      });
      if (session.finishedAt) {
        throw new BadRequestException('Partida já encerrada.');
      }

      const elapsedMs = capRoundClock(
        snapshotElapsedMs(session.elapsedMs, session.timerRunningSince, now),
        session.roundStartedElapsedMs,
        limitMs,
      ).cumulativeMs;

      // Issue #217: não grava a rodada em andamento se ela nem foi jogada.
      await this.persistRoundHistory(tx, session, draw.teams, elapsedMs, {
        skipIfUnplayed: true,
        tie: { rule: tieRule, chosen: tieChoice },
      });

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

    return this.toDto(updated, draw.teams, limitMs, tieRule);
  }

  private toDto(
    session: MatchFieldSession,
    teams: DrawTeam[],
    roundLimitMs: number,
    tieBreak: TieBreakRule | null,
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

    const clock = capRoundClock(
      snapshotElapsedMs(session.elapsedMs, session.timerRunningSince),
      session.roundStartedElapsedMs,
      roundLimitMs,
    );
    const elapsedMs = clock.cumulativeMs;

    return {
      sessionId: session.id,
      matchId: session.matchId,
      rotationPolicy: session.rotationPolicy as FieldRotationPolicy,
      roundNumber: session.roundNumber,
      scoreHome: session.scoreHome,
      scoreAway: session.scoreAway,
      elapsedMs,
      roundElapsedMs: clock.roundElapsedMs,
      roundLimitMs,
      timeUp: clock.timeUp,
      timerRunning: session.timerRunningSince !== null && !clock.timeUp,
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
      tieBreak,
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
  /**
   * `elapsedMs` da sessão é cumulativo (nunca é zerado entre rodadas — só o
   * placar/goalHistory são). `cumulativeElapsedMs` é esse valor no fim da
   * rodada corrente; subtraímos a soma das rodadas já persistidas pra gravar
   * só a duração desta rodada (achado P2 do Codex na PR #158).
   */
  private async persistRoundHistory(
    tx: Prisma.TransactionClient,
    session: MatchFieldSession,
    teams: DrawWithTeams['teams'],
    cumulativeElapsedMs: number,
    opts: {
      skipIfUnplayed?: boolean;
      tie?: {
        rule: TieBreakRule | null;
        chosen?: { winner?: TieSide | null; method?: TieChoiceMethod | null } | null;
      };
    } = {},
  ): Promise<TieSide | null> {
    const home = teams.find((t) => t.sortOrder === session.homeTeamSortOrder);
    const away = teams.find((t) => t.sortOrder === session.awayTeamSortOrder);
    if (!home || !away) {
      throw new BadRequestException('Times em campo inconsistentes com o sorteio.');
    }
    const priorRounds = await tx.matchFieldRound.aggregate({
      where: { sessionId: session.id },
      _sum: { durationMs: true },
    });
    const durationMs = Math.max(
      0,
      cumulativeElapsedMs - (priorRounds._sum.durationMs ?? 0),
    );
    const goals = this.parseGoalHistory(session.goalHistory);
    if (
      opts.skipIfUnplayed &&
      !wasRoundPlayed({
        scoreHome: session.scoreHome,
        scoreAway: session.scoreAway,
        goalCount: goals.length,
        durationMs,
        timerRunning: session.timerRunningSince != null,
      })
    ) {
      return null;
    }
    // Issue #227 — empate: decide pelo critério das Regras (ou escolha do adm).
    // "Quem já estava" = quem ganhou a rodada anterior (com 2 times os lados não trocam).
    let previousWinnerSide: TieSide | null = null;
    if (opts.tie?.rule && session.scoreHome === session.scoreAway && session.roundNumber > 1) {
      const prev = await tx.matchFieldRound.findFirst({
        where: { sessionId: session.id, roundNumber: session.roundNumber - 1 },
      });
      if (prev) {
        const outcome = roundOutcome(prev);
        const prevWinnerTeamId =
          outcome === 'HOME' ? prev.homeDrawTeamId : outcome === 'AWAY' ? prev.awayDrawTeamId : null;
        if (prevWinnerTeamId === home.id) previousWinnerSide = 'HOME';
        else if (prevWinnerTeamId === away.id) previousWinnerSide = 'AWAY';
      }
    }
    const tie = resolveTie({
      rule: opts.tie?.rule ?? null,
      roundNumber: session.roundNumber,
      scoreHome: session.scoreHome,
      scoreAway: session.scoreAway,
      chosen: opts.tie?.chosen,
      previousWinnerSide,
    });
    if (tie.kind === 'need-choice') {
      throw new BadRequestException(
        tie.methods.length > 1
          ? 'Empate! Escolha quem venceu no par ou ímpar ou nos pênaltis.'
          : tie.methods[0] === 'PENALTIS'
            ? 'Empate! Escolha quem venceu nos pênaltis.'
            : 'Empate! Escolha quem venceu no par ou ímpar.',
      );
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
        goals: goals as object,
        durationMs,
        tieWinner: tie.kind === 'decided' ? tie.winner : null,
        tieMethod: tie.kind === 'decided' ? tie.method : null,
      },
    });
    return tie.kind === 'decided' ? tie.winner : null;
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

  /** Issue #229 — tempo de cada partida (Regras da pelada / exceção da partida). */
  /** Issue #227 — critério de desempate da partida (Regras + exceção da partida). */
  private async tieRuleFor(peladaId: string, matchId: string): Promise<TieBreakRule | null> {
    const { match, defaults } = await this.loadMatch(peladaId, matchId);
    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as Record<string, unknown> | null,
    );
    return readTieBreakRule(effective.extra);
  }

  private async roundLimitFor(peladaId: string, matchId: string): Promise<number> {
    const { match, defaults } = await this.loadMatch(peladaId, matchId);
    const effective = mergeEffectiveMatchRules(
      defaults,
      match.rulesOverride as Record<string, unknown> | null,
    );
    return readRoundLimitMs(effective.extra);
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
