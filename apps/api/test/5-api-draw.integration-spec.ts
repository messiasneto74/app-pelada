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

    it('jogador na fila de espera não entra no sorteio', async () => {
      const sub = `draw-queue-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { teamCount: 2, playersPerTeam: 2, capacity: 4 },
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-12-02T19:00:00Z'),
      });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });

      const players = [];
      for (let i = 0; i < 5; i++) {
        players.push(
          await prisma.player.create({
            data: { peladaId: pelada.id, displayName: `P${i}`, rating: 6 },
          }),
        );
      }
      for (const p of players) {
        await request(app.getHttpServer())
          .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'CONFIRMED' })
          .expect(200);
      }
      const list = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const queued = list.body.entries.find(
        (e: { status: string }) => e.status === 'QUEUE',
      );
      expect(queued).toBeDefined();

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 1 })
        .expect(201);

      const drawnIds = res.body.teams.flatMap(
        (t: { playerIds: string[] }) => t.playerIds,
      );
      expect(drawnIds).toHaveLength(4);
      expect(drawnIds).not.toContain(queued.playerId);
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

    it('POST /draw de novo com a partida DRAWN substitui o sorteio (equilibrado e aleatório)', async () => {
      const { pelada, match, token } = await seedDrawableMatch();
      const url = `/peladas/${pelada.id}/matches/${match.id}/draw`;

      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 1 })
        .expect(201);

      const balanced = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 2 })
        .expect(201);
      expect(balanced.body.seed).toBe('2');

      const random = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'RANDOM', seed: 3 })
        .expect(201);
      expect(random.body.seed).toBe('3');
      expect(random.body.teams).toHaveLength(2);
      const ids = random.body.teams.flatMap(
        (t: { playerIds: string[] }) => t.playerIds,
      );
      expect(ids).toHaveLength(6);
      expect(new Set(ids).size).toBe(6);

      expect(await prisma.draw.count({ where: { matchId: match.id } })).toBe(1);
      const m = await prisma.match.findUnique({ where: { id: match.id } });
      expect(m?.status).toBe('DRAWN');

      const get = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(get.body.drawId).toBe(random.body.drawId);
      expect(get.body.seed).toBe('3');
    });

    it('POST /draw de novo com pinnedByTeam respeita os fixos', async () => {
      const { pelada, match, token, p3, p4 } = await seedDrawableMatch();
      const url = `/peladas/${pelada.id}/matches/${match.id}/draw`;

      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 1 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'RANDOM', seed: 5, pinnedByTeam: { '0': [p4.id], '1': [p3.id] } })
        .expect(201);

      const t0 = res.body.teams.find(
        (t: { sortOrder: number }) => t.sortOrder === 0,
      )!;
      const t1 = res.body.teams.find(
        (t: { sortOrder: number }) => t.sortOrder === 1,
      )!;
      expect(t0.playerIds).toContain(p4.id);
      expect(t1.playerIds).toContain(p3.id);
    });

    it('POST /draw com a partida em campo ou encerrada retorna 400', async () => {
      const { pelada, match, token } = await seedDrawableMatch();
      const url = `/peladas/${pelada.id}/matches/${match.id}/draw`;

      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 1 })
        .expect(201);

      for (const status of ['IN_PROGRESS', 'FINISHED'] as const) {
        await prisma.match.update({ where: { id: match.id }, data: { status } });
        const res = await request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({ mode: 'BALANCED', seed: 2 })
          .expect(400);
        expect(res.body.message).toBe(
          'Não é possível sortear depois que a partida foi a campo.',
        );
      }
    });

    it('goleiro fixo por time: fixar os 2 goleiros no mesmo time retorna 400 (issue #220)', async () => {
      const { pelada, match, token, p1, p2 } = await seedDrawableMatch();
      const url = `/peladas/${pelada.id}/matches/${match.id}/draw`;
      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 1 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', pinnedByTeam: { '0': [p1.id, p2.id] } })
        .expect(400);
      expect(res.body.message).toContain('Time A não pode ter 2 goleiros fixos');

      const ok = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'RANDOM', pinnedByTeam: { '0': [p1.id] } });
      expect(ok.status).toBe(201);
      const gks = new Set([p1.id, p2.id]);
      for (const t of ok.body.teams as { playerIds: string[] }[]) {
        expect(t.playerIds.filter((id) => gks.has(id))).toHaveLength(1);
      }
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

    it('POST /draw com goalkeeperMode ROTATING não exclui jogadores marcados como goleiro (A2)', async () => {
      const sub = `draw-rot-gk-${Math.random().toString(36).slice(2, 8)}`;
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
        scheduledAt: new Date('2030-12-03T19:00:00Z'),
      });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });

      const players = [];
      for (let i = 1; i <= 6; i++) {
        const p = await prisma.player.create({
          data: {
            peladaId: pelada.id,
            displayName: `Jogador ${i}`,
            rating: 5 + (i % 3),
            isGoalkeeper: i <= 2,
          },
        });
        players.push(p);
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

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({ mode: 'BALANCED', seed: 7 })
        .expect(201);

      const drawnPlayerIds = res.body.teams.flatMap(
        (t: { playerIds: string[] }) => t.playerIds,
      );
      expect(drawnPlayerIds).toHaveLength(6);
      for (const p of players) {
        expect(drawnPlayerIds).toContain(p.id);
      }
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
