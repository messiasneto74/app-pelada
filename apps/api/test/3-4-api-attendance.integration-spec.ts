import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createMatch } from './factories/match.factory';
import { createPelada } from './factories/pelada.factory';
import { createPlayer } from './factories/player.factory';
import { createUser } from './factories/user.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

if (runHarness) {
  describe('3.4-API match attendance', () => {
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

    async function seedMatch(
      presenceMode: 'ORGANIZER_CLOSES' | 'SELF_CONFIRM' = 'ORGANIZER_CLOSES',
    ) {
      const sub = `att-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-10-01T19:00:00Z'),
      });
      await prisma.match.update({
        where: { id: match.id },
        data: { presenceMode },
      });
      const p1 = await createPlayer(prisma, {
        peladaId: pelada.id,
        displayName: 'Ana',
      });
      const p2 = await createPlayer(prisma, {
        peladaId: pelada.id,
        displayName: 'Bruno',
      });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { capacity: 1 },
      });
      return { pelada, match, token, p1, p2, org };
    }

    it('GET /attendance without token returns 401', async () => {
      const { pelada, match } = await seedMatch();
      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
        .expect(401);
    });

    it('GET /attendance returns 403 for non-member', async () => {
      const { pelada, match } = await seedMatch();
      const outsider = signTestJwt({ sub: 'att-outsider', email: 'x@y.z' });
      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
        .set('Authorization', `Bearer ${outsider}`)
        .expect(403);
    });

    it('GETs concorrentes de /attendance não quebram com 500 (C2)', async () => {
      const sub = `att-c2-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-10-01T19:00:00Z'),
      });
      const players = [];
      for (let i = 0; i < 8; i++) {
        players.push(
          await createPlayer(prisma, {
            peladaId: pelada.id,
            displayName: `P${i}`,
          }),
        );
      }

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
            .set('Authorization', `Bearer ${token}`),
        ),
      );

      expect(results.every((r) => r.status === 200)).toBe(true);

      const rows = await prisma.matchAttendance.findMany({
        where: { matchId: match.id },
      });
      expect(rows).toHaveLength(players.length);
      const uniquePlayerIds = new Set(rows.map((r) => r.playerId));
      expect(uniquePlayerIds.size).toBe(players.length);
    });

    it('PATCH attendance confirms player for organizador', async () => {
      const { pelada, match, token, p1 } = await seedMatch();
      const list = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(list.body.entries.length).toBeGreaterThanOrEqual(2);

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' })
        .expect(200)
        .expect((res) => {
          expect(res.body.counts.confirmed).toBe(1);
        });
    });

    it('PATCH attendance sends second confirm to queue when capacity is 1', async () => {
      const { pelada, match, token, p1, p2 } = await seedMatch();
      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      const bruno = res.body.entries.find(
        (e: { playerId: string }) => e.playerId === p2.id,
      );
      expect(bruno.status).toBe('QUEUE');
    });

    it('POST /attendance/self confirms linked player in SELF_CONFIRM mode', async () => {
      const sub = 'att-self';
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const playerUser = await createUser(prisma, { keycloakSub: `${sub}-pl` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: playerUser.id, role: 'JOGADOR' },
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-11-01T19:00:00Z'),
      });
      await prisma.match.update({
        where: { id: match.id },
        data: { presenceMode: 'SELF_CONFIRM' },
      });
      const linked = await prisma.player.create({
        data: {
          peladaId: pelada.id,
          userId: playerUser.id,
          displayName: 'Eu',
        },
      });
      const token = signTestJwt({
        sub: `${sub}-pl`,
        email: playerUser.email ?? 'p@y.z',
      });

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/self`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'confirm' })
        .expect(201);

      const row = res.body.entries.find(
        (e: { playerId: string }) => e.playerId === linked.id,
      );
      expect(row.status).toBe('CONFIRMED');
    });

    it('POST /attendance/self returns 403 when mode is ORGANIZER_CLOSES', async () => {
      const sub = 'att-self-block';
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const playerUser = await createUser(prisma, { keycloakSub: `${sub}-pl` });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: playerUser.id, role: 'JOGADOR' },
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-11-02T19:00:00Z'),
      });
      await prisma.player.create({
        data: {
          peladaId: pelada.id,
          userId: playerUser.id,
          displayName: 'Eu',
        },
      });
      const token = signTestJwt({
        sub: `${sub}-pl`,
        email: playerUser.email ?? 'p@y.z',
      });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/self`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'confirm' })
        .expect(403);
    });

    it('POST approve guest confirms or queues guest', async () => {
      const { pelada, match, token } = await seedMatch();
      const guestRes = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/guests`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Visitante' })
        .expect(201);
      const guest = guestRes.body.entries.find(
        (e: { isGuest: boolean }) => e.isGuest,
      );
      expect(guest).toBeDefined();

      const approved = await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/attendance/guests/${guest.playerId}/approve`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const row = approved.body.entries.find(
        (e: { playerId: string }) => e.playerId === guest.playerId,
      );
      expect(['CONFIRMED', 'QUEUE']).toContain(row.status);
    });

    it('convidado não vira jogador permanente do elenco (A3)', async () => {
      const { pelada, match, token } = await seedMatch();

      const guestRes = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/guests`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Visitante' })
        .expect(201);
      const guest = guestRes.body.entries.find(
        (e: { isGuest: boolean }) => e.isGuest,
      );
      expect(guest).toBeDefined();

      const roster = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(
        roster.body.players.some(
          (p: { id: string }) => p.id === guest.playerId,
        ),
      ).toBe(false);

      const nextMatch = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-10-08T19:00:00Z'),
      });
      const nextList = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${nextMatch.id}/attendance`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(
        nextList.body.entries.some(
          (e: { playerId: string }) => e.playerId === guest.playerId,
        ),
      ).toBe(false);
    });

    it('confirmações concorrentes não furam a capacidade (C3)', async () => {
      const sub = `att-c3-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-10-01T19:00:00Z'),
      });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { capacity: 4 },
      });
      const players = [];
      for (let i = 0; i < 10; i++) {
        players.push(
          await createPlayer(prisma, {
            peladaId: pelada.id,
            displayName: `P${i}`,
          }),
        );
      }
      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
        .set('Authorization', `Bearer ${token}`);

      await Promise.all(
        players.map((p) =>
          request(app.getHttpServer())
            .patch(
              `/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`,
            )
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'CONFIRMED' }),
        ),
      );

      const confirmed = await prisma.matchAttendance.count({
        where: { matchId: match.id, status: 'CONFIRMED' },
      });
      expect(confirmed).toBe(4);

      const queue = await prisma.matchAttendance.findMany({
        where: { matchId: match.id, status: 'QUEUE' },
        orderBy: { queuePosition: 'asc' },
      });
      expect(queue).toHaveLength(6);
      expect(queue.map((q) => q.queuePosition)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('POST close-list blocks further PATCH until reopen', async () => {
      const { pelada, match, token, p1 } = await seedMatch();
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201)
        .expect((res) => expect(res.body.listClosed).toBe(true));

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/matches/${match.id}/attendance/${p1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' })
        .expect(400);

      await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/attendance/reopen-list`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(201)
        .expect((res) => expect(res.body.listClosed).toBe(false));
    });

    it('close-list e reopen-list não regridem partida já sorteada/em campo (C5)', async () => {
      const sub = `att-c5-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-10-01T19:00:00Z'),
      });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { teamCount: 2, playersPerTeam: 2, capacity: null },
      });
      const players = [];
      for (let i = 0; i < 4; i++) {
        players.push(
          await createPlayer(prisma, {
            peladaId: pelada.id,
            displayName: `P${i}`,
          }),
        );
      }
      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${match.id}/attendance`)
        .set('Authorization', `Bearer ${token}`);
      for (const p of players) {
        await request(app.getHttpServer())
          .patch(
            `/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`,
          )
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'CONFIRMED' });
      }
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/draw`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(201);

      // Depois do sorteio (DRAWN), close-list não pode mais agir.
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/field-session`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(201);

      // Partida IN_PROGRESS: nem close-list nem reopen-list podem regredir o status.
      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches/${match.id}/attendance/close-list`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      await request(app.getHttpServer())
        .post(
          `/peladas/${pelada.id}/matches/${match.id}/attendance/reopen-list`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      const unchanged = await prisma.match.findUniqueOrThrow({
        where: { id: match.id },
      });
      expect(unchanged.status).toBe('IN_PROGRESS');
    });

    it('presença não pode ser editada depois do sorteio (A4)', async () => {
      const sub = `att-a4-${Math.random().toString(36).slice(2, 8)}`;
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({
        sub: `${sub}-org`,
        email: org.email ?? 'o@y.z',
      });
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: new Date('2030-10-01T19:00:00Z'),
      });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { teamCount: 2, playersPerTeam: 2, capacity: null },
      });
      const players = [];
      for (let i = 0; i < 4; i++) {
        players.push(
          await createPlayer(prisma, {
            peladaId: pelada.id,
            displayName: `P${i}`,
          }),
        );
      }
      for (const p of players) {
        await request(app.getHttpServer())
          .patch(
            `/peladas/${pelada.id}/matches/${match.id}/attendance/${p.id}`,
          )
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
        .send({})
        .expect(201);

      // Depois de DRAWN, presença não pode mais ser alterada pelo organizador.
      await request(app.getHttpServer())
        .patch(
          `/peladas/${pelada.id}/matches/${match.id}/attendance/${players[0].id}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'DECLINED' })
        .expect(400);

      const unchanged = await prisma.matchAttendance.findUnique({
        where: {
          matchId_playerId: { matchId: match.id, playerId: players[0].id },
        },
      });
      expect(unchanged?.status).toBe('CONFIRMED');
    });
  });
}
