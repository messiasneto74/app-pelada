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
  });
}
