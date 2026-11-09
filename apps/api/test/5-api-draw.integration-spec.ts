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
  describe('5-API draw + swap', () => {
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

    async function seedDrawableMatch() {
      const sub = `draw-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: {
          teamCount: 2,
          playersPerTeam: 3,
          capacity: null,
          goalkeeperMode: 'FIXED_PER_TEAM',
        },
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-12-01T19:00:00Z'),
      });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });

      const p1 = await prisma.player.create({
        data: {
          peladaId: pelada.id,
          displayName: 'GK A',
          isGoalkeeper: true,
          rating: 8,
        },
      });
      const p2 = await prisma.player.create({
        data: {
          peladaId: pelada.id,
          displayName: 'GK B',
          isGoalkeeper: true,
          rating: 7,
        },
      });
      const p3 = await prisma.player.create({
        data: { peladaId: pelada.id, displayName: 'Linha 1', rating: 6 },
      });
      const p4 = await prisma.player.create({
        data: { peladaId: pelada.id, displayName: 'Linha 2', rating: 6 },
      });
      const p5 = await prisma.player.create({
        data: { peladaId: pelada.id, displayName: 'Linha 3', rating: 5 },
      });
      const p6 = await prisma.player.create({
        data: { peladaId: pelada.id, displayName: 'Linha 4', rating: 5 },
      });

      for (const p of [p1, p2, p3, p4, p5, p6]) {
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      return { pelada, match, token, p1, p2, p3, p4, p5, p6 };
    }

    it('GET /draw sem sorteio retorna 404', async () => {
      const { pelada, match, token } = await seedDrawableMatch();
      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('POST /draw without token returns 401', async () => {
      const { pelada, match } = await seedDrawableMatch();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .send({})
        .expect(401);
    });

    it('POST /draw persiste times e GET /draw devolve métricas', async () => {
      const { pelada, match, token } = await seedDrawableMatch();

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 42 })
        .expect(201);

      expect(res.body.teams).toHaveLength(2);
      expect(res.body.teams[0].playerIds.length).toBe(3);
      expect(res.body.teams[1].playerIds.length).toBe(3);
      expect(res.body.metrics.balanceScore).toBeGreaterThanOrEqual(0);

      const m = await prisma.match.findUnique({ where: { id: match.id } });
      expect(m?.status).toBe('DRAWN');

      const get = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(get.body.drawId).toBe(res.body.drawId);
      expect(get.body.metrics.maxAverageDiff).toBeGreaterThanOrEqual(0);
    });

    it('PATCH /draw/swap troca jogadores entre times', async () => {
      const { pelada, match, token } = await seedDrawableMatch();

      const draw = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 1 })
        .expect(201);

      const t0 = draw.body.teams.find(
        (t: { sortOrder: number }) => t.sortOrder === 0,
      )!;
      const t1 = draw.body.teams.find(
        (t: { sortOrder: number }) => t.sortOrder === 1,
      )!;
      const a = t0.playerIds[0];
      const b = t1.playerIds[0];

      const swapped = await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/draw/swap`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playerAId: a, playerBId: b })
        .expect(200);

      const nt0 = swapped.body.teams.find(
        (t: { sortOrder: number }) => t.sortOrder === 0,
      )!;
      const nt1 = swapped.body.teams.find(
        (t: { sortOrder: number }) => t.sortOrder === 1,
      )!;
      expect(nt0.playerIds).toContain(b);
      expect(nt1.playerIds).toContain(a);
    });

    it('POST /draw antes de fechar lista retorna 400', async () => {
      const sub = `draw-bad-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { teamCount: 2, playersPerTeam: 2 },
      });
      const match = await createMatch(prisma, { pelada });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const p1 = await prisma.player.create({
        data: { peladaId: pelada.id, displayName: 'A', rating: 7 },
      });
      const p2 = await prisma.player.create({
        data: {
          peladaId: pelada.id,
          displayName: 'B',
          rating: 7,
          isGoalkeeper: true,
        },
      });
      const p3 = await prisma.player.create({
        data: {
          peladaId: pelada.id,
          displayName: 'C',
          rating: 7,
          isGoalkeeper: true,
        },
      });
      const p4 = await prisma.player.create({
        data: { peladaId: pelada.id, displayName: 'D', rating: 7 },
      });
      for (const p of [p1, p2, p3, p4]) {
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('POST /draw com goalkeeperMode ROTATING (sem GK marcados)', async () => {
      const sub = `draw-rot-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: {
          teamCount: 2,
          playersPerTeam: 3,
          goalkeeperMode: 'ROTATING',
        },
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-12-02T19:00:00Z'),
      });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      for (let i = 1; i <= 6; i++) {
        const p = await prisma.player.create({
          data: {
            peladaId: pelada.id,
            displayName: `Linha ${i}`,
            rating: 5 + (i % 3),
            isGoalkeeper: false,
          },
        });
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 7 })
        .expect(201);
    });

    it('jogador não-organizador recebe 403 no POST /draw', async () => {
      const { pelada, match, token } = await seedDrawableMatch();
      const other = await createUser(prisma, {
        keycloakSub: `draw-pl-${Math.random().toString(36).slice(2)}`,
      });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: other.id, role: 'JOGADOR' },
      });
      const plToken = signTestJwt({
        sub: other.keycloakSub,
        email: other.email ?? 'p@y.z',
      });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${plToken}`)
        .send({ seed: 1 })
        .expect(403);
    });
  });
}
