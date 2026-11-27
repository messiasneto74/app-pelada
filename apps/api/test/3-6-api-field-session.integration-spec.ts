import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createMatch } from './factories/match.factory';
import { createPelada } from './factories/pelada.factory';
import { createUser } from './factories/user.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

if (runHarness) {
  describe('3.6-API field session', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

    beforeAll(async () => {
      const ctx = await createTestApp();
      app = ctx.app;
      prisma = ctx.prisma;
    });

    beforeEach(async () => {
      await resetDatabase(prisma);
    });

    afterAll(async () => {
      await app.close();
    });

    async function seedThreeTeamDraw() {
      const sub = `field-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const jogador = await createUser(prisma, {
        keycloakSub: `${sub}-j`,
        email: 'j@ex.com',
      });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: jogador.id, role: 'JOGADOR' },
      });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: {
          teamCount: 3,
          playersPerTeam: 3,
          capacity: null,
          goalkeeperMode: 'FIXED_PER_TEAM',
          extra: { rotationPolicy: 'WINNER_STAYS' },
        },
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-12-01T19:00:00Z'),
      });
      const orgToken = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const jogadorToken = signTestJwt({
        sub: `${sub}-j`,
        email: 'j@ex.com',
      });

      const players = [];
      for (let i = 0; i < 9; i++) {
        const p = await prisma.player.create({
          data: {
            peladaId: pelada.id,
            displayName: `P${i + 1}`,
            rating: 6 + (i % 3),
            isGoalkeeper: i % 3 === 0,
          },
        });
        players.push(p);
      }

      for (const p of players) {
        await request(app.getHttpServer())
          .patch(
            `/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`,
          )
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }

      await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`,
        )
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ mode: 'BALANCED', seed: 11 })
        .expect(201);

      return { pelada, match, orgToken, jogadorToken };
    }

    it('GET /field-session sem sessão retorna 404', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .get(
          `/peladas/${pelada.id}/matches/${match.id}/field-session`,
        )
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(404);
    });

    it('POST /field-session inicia com dois times em campo', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      expect(res.body.rotationPolicy).toBe('WINNER_STAYS');
      expect(res.body.teamsOnField).toHaveLength(2);
      expect(res.body.restingTeams).toHaveLength(1);
      expect(res.body.scoreHome).toBe(0);
      expect(res.body.scoreAway).toBe(0);

      const m = await prisma.match.findUnique({ where: { id: match.id } });
      expect(m?.status).toBe('IN_PROGRESS');
    });

    it('PATCH /field-session registra gol e timer', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      const scored = await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME' })
        .expect(200);

      expect(scored.body.scoreHome).toBe(1);

      const timer = await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'start' })
        .expect(200);

      expect(timer.body.timerRunning).toBe(true);
    });

    it('POST /field-session/end-round aplica ganha-fica (3 times)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      const start = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      const homeSort = start.body.teamsOnField[0].sortOrder as number;

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME' })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME' })
        .expect(200);

      const next = await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/field-session/end-round`,
        )
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      expect(next.body.roundNumber).toBe(2);
      expect(next.body.scoreHome).toBe(0);
      expect(next.body.scoreAway).toBe(0);
      expect(next.body.teamsOnField[0].sortOrder).toBe(homeSort);
      const onField = next.body.teamsOnField.map(
        (t: { sortOrder: number }) => t.sortOrder,
      );
      expect(onField).toHaveLength(2);
      expect(onField).toContain(homeSort);
      expect(onField).not.toEqual([
        start.body.teamsOnField[0].sortOrder,
        start.body.teamsOnField[1].sortOrder,
      ]);
    });

    it('gols concorrentes não se perdem (C4)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
            .set('Authorization', `Bearer ${orgToken}`)
            .send({ addGoal: 'HOME' }),
        ),
      );
      expect(results.every((r) => r.status === 200)).toBe(true);

      const final = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      expect(final.body.scoreHome).toBe(5);
    });

    it('só organizador pode iniciar sessão', async () => {
      const { pelada, match, jogadorToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${jogadorToken}`)
        .send({})
        .expect(403);
    });

    it('registra o jogador que fez o gol e persiste o histórico da rodada', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      const start = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      const homeTeamId = start.body.teamsOnField[0].drawTeamId as string;
      const awayTeamId = start.body.teamsOnField[1].drawTeamId as string;
      const homePlayer = await prisma.drawTeamPlayer.findFirstOrThrow({
        where: { teamId: homeTeamId },
      });
      const awayPlayer = await prisma.drawTeamPlayer.findFirstOrThrow({
        where: { teamId: awayTeamId },
      });

      // Jogador de fora do time em campo não pode ser marcado como autor do gol.
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME', goalPlayerId: awayPlayer.playerId })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME', goalPlayerId: homePlayer.playerId })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'AWAY', goalPlayerId: awayPlayer.playerId })
        .expect(200);

      await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/field-session/end-round`,
        )
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const rounds = await prisma.matchFieldRound.findMany({
        where: { matchId: match.id },
      });
      expect(rounds).toHaveLength(1);
      expect(rounds[0]).toMatchObject({
        roundNumber: 1,
        homeDrawTeamId: homeTeamId,
        awayDrawTeamId: awayTeamId,
        scoreHome: 1,
        scoreAway: 1,
      });
      expect(rounds[0]!.goals).toEqual([
        { side: 'HOME', playerId: homePlayer.playerId },
        { side: 'AWAY', playerId: awayPlayer.playerId },
      ]);

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      // Issue #217: a rodada 2 nem começou (sem gol e sem cronômetro) —
      // encerrar a partida não grava um 0×0 fantasma.
      const allRounds = await prisma.matchFieldRound.findMany({
        where: { matchId: match.id },
      });
      expect(allRounds).toHaveLength(1);
    });

    it('encerrar a partida no meio de uma rodada com gol grava essa rodada (issue #217)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/end-round`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'AWAY' })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const summary = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/field-session/summary`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      // rodada 1 (0×0 encerrada pelo organizador) + rodada 2 (0×1 em andamento)
      expect(summary.body.rounds).toBe(2);
    });

    it('gol concorrente com end-round não se perde do histórico (C4)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME' })
        .expect(200);

      // Dispara um gol e o fim da rodada ao mesmo tempo (dois celulares).
      // O lock FOR UPDATE serializa os dois — o gol cai na rodada 1 (e é
      // gravado no histórico) ou já na rodada 2 (placar da sessão), nunca
      // some das duas.
      const [goalRes, endRoundRes] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ addGoal: 'HOME' }),
        request(app.getHttpServer())
          .post(
            `/peladas/${pelada.id}/matches/${match.id}/field-session/end-round`,
          )
          .set('Authorization', `Bearer ${orgToken}`),
      ]);
      expect(goalRes.status).toBe(200);
      expect(endRoundRes.status).toBe(200);

      const rounds = await prisma.matchFieldRound.findMany({
        where: { matchId: match.id },
        orderBy: { roundNumber: 'asc' },
      });
      expect(rounds).toHaveLength(1);

      const session = await prisma.matchFieldSession.findUniqueOrThrow({
        where: { matchId: match.id },
      });

      // O gol concorrente caiu na rodada 1 (histórico 2x0, sessão zerada) ou
      // já na rodada 2 (histórico 1x0, sessão com o gol) — nunca se perde
      // das duas, e nunca é contado duas vezes.
      const landedInRound1 = rounds[0]!.scoreHome === 2 && session.scoreHome === 0;
      const landedInRound2 = rounds[0]!.scoreHome === 1 && session.scoreHome === 1;
      expect(landedInRound1 || landedInRound2).toBe(true);
    });

    it('grava a duração de cada rodada, não o tempo acumulado da sessão', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      // Rodada 1: cronômetro correndo por ~300ms.
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'start' })
        .expect(200);
      await new Promise((r) => setTimeout(r, 300));
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'pause' })
        .expect(200);

      await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/field-session/end-round`,
        )
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      // Rodada 2: cronômetro correndo por ~50ms — bem menos que a rodada 1.
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'start' })
        .expect(200);
      await new Promise((r) => setTimeout(r, 50));
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const rounds = await prisma.matchFieldRound.findMany({
        where: { matchId: match.id },
        orderBy: { roundNumber: 'asc' },
      });
      expect(rounds).toHaveLength(2);
      // Se a rodada 2 acumulasse o tempo da sessão (bug), ficaria perto de
      // 300+50=350ms. Deve ficar perto dos ~50ms próprios dela, bem menor
      // que a soma — nunca maior que a duração da rodada 1.
      expect(rounds[1]!.durationMs).toBeLessThan(rounds[0]!.durationMs);
    });

    describe('desempate (issue #227)', () => {
      async function startTied(tieBreak: string) {
        const ctx = await seedThreeTeamDraw();
        await prisma.peladaRules.update({
          where: { peladaId: ctx.pelada.id },
          data: { extra: { tieBreak } },
        });
        const base = `/peladas/${ctx.pelada.id}/matches/${ctx.match.id}/field-session`;
        await request(app.getHttpServer())
          .post(base)
          .set('Authorization', `Bearer ${ctx.orgToken}`)
          .send({})
          .expect(201);
        const tieNow = () =>
          prisma.matchFieldSession.update({
            where: { matchId: ctx.match.id },
            data: { scoreHome: 1, scoreAway: 1, elapsedMs: 60_000 },
          });
        await tieNow();
        return { ...ctx, base, tieNow };
      }
      const endRound = (base: string, token: string, body: object = {}) =>
        request(app.getHttpServer()).post(`${base}/end-round`).set('Authorization', `Bearer ${token}`).send(body);

      it('par ou ímpar: sem escolha → 400; com escolha conta como vitória e o vencedor fica', async () => {
        const { base, orgToken, match, tieNow } = await startTied('PAR_IMPAR');
        const need = await endRound(base, orgToken).expect(400);
        expect(need.body.message).toBe('Empate! Escolha quem venceu no par ou ímpar.');
        const s1 = await prisma.matchFieldSession.findUniqueOrThrow({ where: { matchId: match.id } });
        expect(s1.roundNumber).toBe(1); // nada gravado

        await endRound(base, orgToken, { winner: 'AWAY' }).expect(200);
        const after1 = await prisma.matchFieldSession.findUniqueOrThrow({ where: { matchId: match.id } });
        expect(after1.homeTeamSortOrder).toBe(s1.awayTeamSortOrder); // vencedor do desempate fica
        const round1 = await prisma.matchFieldRound.findFirstOrThrow({ where: { matchId: match.id, roundNumber: 1 } });
        expect([round1.tieWinner, round1.tieMethod]).toEqual(['AWAY', 'PAR_IMPAR']);

        // rodada 2 empatada de novo: par ou ímpar pede escolha sempre
        await tieNow();
        await endRound(base, orgToken).expect(400);
        await endRound(base, orgToken, { winner: 'HOME' }).expect(200);

        const summary = await request(app.getHttpServer())
          .get(`${base}/summary`)
          .set('Authorization', `Bearer ${orgToken}`)
          .expect(200);
        const totals = summary.body.teams.reduce(
          (acc: { w: number; d: number; l: number }, t: { wins: number; draws: number; losses: number }) => ({
            w: acc.w + t.wins,
            d: acc.d + t.draws,
            l: acc.l + t.losses,
          }),
          { w: 0, d: 0, l: 0 },
        );
        expect(totals).toEqual({ w: 2, d: 0, l: 2 }); // 2 rodadas, nenhuma como empate
      });

      it('quem já estava: 1ª rodada o adm decide (pênaltis); depois fica quem estava sozinho', async () => {
        const { base, orgToken, match, tieNow } = await startTied('STAYED');
        const need = await endRound(base, orgToken).expect(400);
        expect(need.body.message).toBe('Empate! Escolha quem venceu no par ou ímpar ou nos pênaltis.');
        await endRound(base, orgToken, { winner: 'HOME', method: 'PENALTIS' }).expect(200);
        const r1 = await prisma.matchFieldRound.findFirstOrThrow({ where: { matchId: match.id, roundNumber: 1 } });
        expect([r1.tieWinner, r1.tieMethod]).toEqual(['HOME', 'PENALTIS']);

        await tieNow();
        const s2 = await prisma.matchFieldSession.findUniqueOrThrow({ where: { matchId: match.id } });
        await endRound(base, orgToken).expect(200);
        const after2 = await prisma.matchFieldSession.findUniqueOrThrow({ where: { matchId: match.id } });
        expect(after2.homeTeamSortOrder).toBe(s2.homeTeamSortOrder); // quem já estava fica
        const r2 = await prisma.matchFieldRound.findFirstOrThrow({ where: { matchId: match.id, roundNumber: 2 } });
        expect([r2.tieWinner, r2.tieMethod]).toEqual(['HOME', 'STAYED']);
      });

      it('quem entrou por último: a partir da 2ª rodada o time de fora fica', async () => {
        const { base, orgToken, match, tieNow } = await startTied('LAST_IN');
        await endRound(base, orgToken, { winner: 'HOME', method: 'PAR_IMPAR' }).expect(200);
        await tieNow();
        const s2 = await prisma.matchFieldSession.findUniqueOrThrow({ where: { matchId: match.id } });
        await endRound(base, orgToken).expect(200);
        const after2 = await prisma.matchFieldSession.findUniqueOrThrow({ where: { matchId: match.id } });
        expect(after2.homeTeamSortOrder).toBe(s2.awayTeamSortOrder);
        const r2 = await prisma.matchFieldRound.findFirstOrThrow({ where: { matchId: match.id, roundNumber: 2 } });
        expect([r2.tieWinner, r2.tieMethod]).toEqual(['AWAY', 'LAST_IN']);
      });

      it('a tela recebe o critério DESTA partida (exceção da partida vale, não as Regras atuais)', async () => {
        const { base, orgToken, match, pelada } = await startTied('LAST_IN');
        await prisma.match.update({
          where: { id: match.id },
          data: { rulesOverride: { extra: { tieBreak: 'PAR_IMPAR' } } },
        });
        await prisma.peladaRules.update({ where: { peladaId: pelada.id }, data: { extra: { tieBreak: 'STAYED' } } });
        const s = await request(app.getHttpServer())
          .get(base)
          .set('Authorization', `Bearer ${orgToken}`)
          .expect(200);
        expect(s.body.tieBreak).toBe('PAR_IMPAR');
        // e a API cobra a escolha de acordo com esse mesmo critério
        const need = await endRound(base, orgToken).expect(400);
        expect(need.body.message).toBe('Empate! Escolha quem venceu no par ou ímpar.');
      });

      it('2 times, "quem já estava": fica quem ganhou a anterior mesmo de visitante', async () => {
        const sub = `field2-${Math.random().toString(36).slice(2, 8)}`;
        const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
        const pelada = await createPelada(prisma, { owner: org });
        await prisma.peladaRules.update({
          where: { peladaId: pelada.id },
          data: { teamCount: 2, playersPerTeam: 3, capacity: null, goalkeeperMode: 'ROTATING', extra: { tieBreak: 'STAYED' } },
        });
        const match = await createMatch(prisma, { pelada, scheduledAt: new Date('2030-12-02T19:00:00Z') });
        const orgToken = signTestJwt({ sub: `${sub}-org`, email: org.email ?? 'o@y.z' });
        const base = `/peladas/${pelada.id}/matches/${match.id}`;
        for (let i = 0; i < 6; i++) {
          const p = await prisma.player.create({ data: { peladaId: pelada.id, displayName: `Q${i}`, rating: 6 } });
          await request(app.getHttpServer())
            .patch(`${base}/attendance/${p.id}`)
            .set('Authorization', `Bearer ${orgToken}`)
            .send({ status: 'CONFIRMED' })
            .expect(200);
        }
        await request(app.getHttpServer()).post(`${base}/attendance/close-list`).set('Authorization', `Bearer ${orgToken}`).expect(201);
        await request(app.getHttpServer()).post(`${base}/draw`).set('Authorization', `Bearer ${orgToken}`).send({ mode: 'BALANCED', seed: 3 }).expect(201);
        await request(app.getHttpServer()).post(`${base}/field-session`).set('Authorization', `Bearer ${orgToken}`).send({}).expect(201);

        // rodada 1: visitante ganha 2×1
        await prisma.matchFieldSession.update({ where: { matchId: match.id }, data: { scoreHome: 1, scoreAway: 2, elapsedMs: 60_000 } });
        await request(app.getHttpServer()).post(`${base}/field-session/end-round`).set('Authorization', `Bearer ${orgToken}`).send({}).expect(200);
        // rodada 2 empatada: fica quem ganhou a anterior (o visitante)
        await prisma.matchFieldSession.update({ where: { matchId: match.id }, data: { scoreHome: 0, scoreAway: 0, elapsedMs: 120_000 } });
        await request(app.getHttpServer()).post(`${base}/field-session/end-round`).set('Authorization', `Bearer ${orgToken}`).send({}).expect(200);
        const r2 = await prisma.matchFieldRound.findFirstOrThrow({ where: { matchId: match.id, roundNumber: 2 } });
        expect([r2.tieWinner, r2.tieMethod]).toEqual(['AWAY', 'STAYED']);
      });

      it('encerrar a partida empatada também pede o desempate', async () => {
        const { base, orgToken } = await startTied('PENALTIS');
        const need = await request(app.getHttpServer())
          .post(`${base}/finish`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({})
          .expect(400);
        expect(need.body.message).toBe('Empate! Escolha quem venceu nos pênaltis.');
        await request(app.getHttpServer())
          .post(`${base}/finish`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ winner: 'AWAY' })
          .expect(200);
      });
    });

    it('cronômetro por rodada: o jogador vê o mesmo tempo que o adm (issue #229)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { extra: { roundMinutes: 1 } },
      });
      const sub = `fs-229-jog-${Math.random().toString(36).slice(2, 8)}`;
      const jog = await createUser(prisma, { keycloakSub: sub });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: jog.id, role: 'JOGADOR' },
      });
      const jogToken = signTestJwt({ sub, email: jog.email ?? 'j@f.s' });
      const base = `/peladas/${pelada.id}/matches/${match.id}/field-session`;
      await request(app.getHttpServer())
        .post(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      // cronômetro rodando há 30 s (limite 1 min): os dois veem ~30 s correndo
      await prisma.matchFieldSession.update({
        where: { matchId: match.id },
        data: { timerRunningSince: new Date(Date.now() - 30_000) },
      });
      const adm = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      const player = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${jogToken}`)
        .expect(200);
      for (const s of [adm.body, player.body]) {
        expect(s.timerRunning).toBe(true);
        expect(s.timeUp).toBe(false);
        expect(s.roundLimitMs).toBe(60_000);
        expect(s.roundElapsedMs).toBeGreaterThanOrEqual(30_000);
        expect(s.roundElapsedMs).toBeLessThan(60_000);
      }
      expect(Math.abs(player.body.roundElapsedMs - adm.body.roundElapsedMs)).toBeLessThan(2_000);

      // passou do limite: os dois veem o relógio parado em 1:00 e "tempo acabou"
      await prisma.matchFieldSession.update({
        where: { matchId: match.id },
        data: { timerRunningSince: new Date(Date.now() - 120_000) },
      });
      const admUp = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      const playerUp = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${jogToken}`)
        .expect(200);
      for (const s of [admUp.body, playerUp.body]) {
        expect(s.roundElapsedMs).toBe(60_000);
        expect(s.timeUp).toBe(true);
        expect(s.timerRunning).toBe(false);
      }
    });

    it('cronômetro por rodada: para no tempo das Regras e zera na rodada seguinte (issue #229)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { extra: { roundMinutes: 1 } },
      });
      const base = `/peladas/${pelada.id}/matches/${match.id}/field-session`;
      const start = await request(app.getHttpServer())
        .post(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);
      expect(start.body.roundLimitMs).toBe(60_000);
      expect(start.body.roundElapsedMs).toBe(0);

      // simula o cronômetro rodando há 2 minutos (limite é 1)
      await prisma.matchFieldSession.update({
        where: { matchId: match.id },
        data: { timerRunningSince: new Date(Date.now() - 120_000) },
      });
      let s = await request(app.getHttpServer())
        .get(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      expect(s.body.roundElapsedMs).toBe(60_000);
      expect(s.body.timeUp).toBe(true);
      expect(s.body.timerRunning).toBe(false);

      // pausar grava o relógio parado no limite; não dá pra reiniciar
      s = await request(app.getHttpServer())
        .patch(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'pause' })
        .expect(200);
      expect(s.body.elapsedMs).toBe(60_000);
      const again = await request(app.getHttpServer())
        .patch(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'start' })
        .expect(400);
      expect(again.body.message).toContain('O tempo desta partida acabou');

      // encerrar a rodada: duração gravada = 1 min; rodada 2 começa do zero
      const next = await request(app.getHttpServer())
        .post(`${base}/end-round`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);
      expect(next.body.roundNumber).toBe(2);
      expect(next.body.roundElapsedMs).toBe(0);
      expect(next.body.timeUp).toBe(false);
      const round1 = await prisma.matchFieldRound.findFirstOrThrow({
        where: { matchId: match.id, roundNumber: 1 },
      });
      expect(round1.durationMs).toBe(60_000);

      await request(app.getHttpServer())
        .patch(base)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'start' })
        .expect(200);
    });

        it('GET field-session/summary agrega vitórias, goleada, perdedor e artilheiro do dia', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      const start = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);

      const homeTeamId = start.body.teamsOnField[0].drawTeamId as string;
      const awayTeamId = start.body.teamsOnField[1].drawTeamId as string;
      const homePlayers = await prisma.drawTeamPlayer.findMany({
        where: { teamId: homeTeamId },
        take: 2,
      });
      const awayPlayer = await prisma.drawTeamPlayer.findFirstOrThrow({
        where: { teamId: awayTeamId },
      });

      // Rodada 1: time da casa 3x1 — mesmo jogador faz 2 dos 3 gols.
      for (const scorer of [homePlayers[0]!, homePlayers[0]!, homePlayers[1]!]) {
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ addGoal: 'HOME', goalPlayerId: scorer.playerId })
          .expect(200);
      }
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'AWAY', goalPlayerId: awayPlayer.playerId })
        .expect(200);

      await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/field-session/end-round`,
        )
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      // Rodada 2: empate 0x0 jogado (cronômetro rodando) — não deve mudar
      // goleada nem gerar derrota nova. Sem cronômetro nem gol ela não
      // contaria (issue #217).
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ timer: 'start' })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const summary = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/field-session/summary`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      expect(summary.body.rounds).toBe(2);
      expect(summary.body.teams).toHaveLength(3);

      const homeAgg = summary.body.teams.find(
        (t: { drawTeamId: string }) => t.drawTeamId === homeTeamId,
      );
      expect(homeAgg).toMatchObject({ wins: 1, losses: 0, goalsFor: 3, goalsAgainst: 1 });

      const awayAgg = summary.body.teams.find(
        (t: { drawTeamId: string }) => t.drawTeamId === awayTeamId,
      );
      expect(awayAgg).toMatchObject({ wins: 0, losses: 1, goalsFor: 1, goalsAgainst: 3 });

      expect(summary.body.biggestWin).toMatchObject({
        winnerDrawTeamId: homeTeamId,
        loserDrawTeamId: awayTeamId,
        scoreWinner: 3,
        scoreLoser: 1,
        margin: 2,
      });

      expect(summary.body.mostLosses).toMatchObject({
        drawTeamId: awayTeamId,
        losses: 1,
      });

      expect(summary.body.topScorer).toMatchObject({
        playerId: homePlayers[0]!.playerId,
        goals: 2,
      });

      // Sem template configurado, usa o padrão com as variáveis já preenchidas.
      expect(summary.body.text).toContain('2 rodada(s)');
      expect(summary.body.text).toContain('3x1');
      expect(summary.body.text).toContain(homeAgg.name);
    });

    it('GET field-session/summary renderiza o template livre configurado pelo organizador', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/rules`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ extra: { summaryTemplate: 'Zoação: {artilheiro} comeu bola hoje ({golsArtilheiro} gols)!' } })
        .expect(200);

      const start = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);
      const homeTeamId = start.body.teamsOnField[0].drawTeamId as string;
      const scorer = await prisma.drawTeamPlayer.findFirstOrThrow({
        where: { teamId: homeTeamId },
      });

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: 'HOME', goalPlayerId: scorer.playerId })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const summary = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/field-session/summary`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const player = await prisma.player.findUniqueOrThrow({
        where: { id: scorer.playerId },
      });
      expect(summary.body.text).toBe(
        `Zoação: ${player.displayName} comeu bola hoje (1 gols)!`,
      );
    });

    it('GET players-summary agrega por jogador entre dois dias (times diferentes)', async () => {
      const { pelada, match, orgToken } = await seedThreeTeamDraw();

      const start1 = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);
      const home1Id = start1.body.teamsOnField[0].drawTeamId as string;
      const away1Id = start1.body.teamsOnField[1].drawTeamId as string;
      const scorerDay1 = await prisma.drawTeamPlayer.findFirstOrThrow({
        where: { teamId: home1Id },
      });
      const loserDay1 = await prisma.drawTeamPlayer.findFirstOrThrow({
        where: { teamId: away1Id },
      });

      // Dia 1: time da casa vence 2x0 — artilheiro marca os 2 gols.
      for (const _ of [0, 1]) {
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ addGoal: 'HOME', goalPlayerId: scorerDay1.playerId })
          .expect(200);
      }
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      // Dia 2: segunda partida da mesma pelada — sorteio novo, times diferentes.
      // Só 2 times neste dia (sem time de descanso), pra garantir que todo
      // jogador confirmado entra em campo e a asserção de derrota é determinística.
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { teamCount: 2 },
      });
      const match2 = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-12-08T19:00:00Z'),
      });
      const allPlayers = await prisma.player.findMany({
        where: { peladaId: pelada.id },
      });
      for (const p of allPlayers) {
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match2.id}/attendance/${p.id}`)
          .set('Authorization', `Bearer ${orgToken}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match2.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match2.id}/draw`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ mode: 'BALANCED', seed: 22 })
        .expect(201);

      const start2 = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match2.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({})
        .expect(201);
      const home2Id = start2.body.teamsOnField[0].drawTeamId as string;

      // No dia 2, o mesmo artilheiro do dia 1 pode estar em outro time (sorteio
      // novo) — busca o time em que ele caiu desta vez pra marcar o gol certo.
      const scorerTeamDay2 = await prisma.drawTeamPlayer.findFirst({
        where: {
          playerId: scorerDay1.playerId,
          teamId: { in: [home2Id, start2.body.teamsOnField[1].drawTeamId] },
        },
      });
      const scorerSideDay2 = scorerTeamDay2?.teamId === home2Id ? 'HOME' : 'AWAY';

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match2.id}/field-session`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ addGoal: scorerSideDay2, goalPlayerId: scorerDay1.playerId })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match2.id}/field-session/finish`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const summary = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/players-summary`)
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      expect(summary.body.matches).toBe(2);
      expect(summary.body.topScorer).toMatchObject({
        playerId: scorerDay1.playerId,
        goals: 3,
      });

      const scorerAgg = summary.body.players.find(
        (p: { playerId: string }) => p.playerId === scorerDay1.playerId,
      );
      expect(scorerAgg).toMatchObject({ played: 2, goals: 3 });

      // No dia 2 o sorteio é novo — loserDay1 pode cair em qualquer time (inclusive
      // o time que folga naquela rodada), então só a derrota do dia 1 é garantida.
      const loserAgg = summary.body.players.find(
        (p: { playerId: string }) => p.playerId === loserDay1.playerId,
      );
      expect(loserAgg.losses).toBeGreaterThanOrEqual(1);
    });
  });
}
