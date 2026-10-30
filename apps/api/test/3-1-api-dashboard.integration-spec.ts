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

(runHarness ? describe : describe.skip)(
  '3.1-API GET /peladas/:id/dashboard',
  () => {
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

    it('GET /peladas/:id/dashboard without token returns 401', async () => {
      const user = await createUser(prisma, { keycloakSub: 'dash-401' });
      const pelada = await createPelada(prisma, { owner: user });

      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/dashboard`)
        .expect(401);
    });

    it('GET /peladas/:id/dashboard returns empty next match for member', async () => {
      const sub = 'dash-empty';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'd@sh.c' });

      const res = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/dashboard`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        peladaId: pelada.id,
        nextMatch: null,
        rosterPlayerCount: 0,
        cashMonth: { receivedCents: 0, expectedCents: 0 },
      });
    });

    it('GET /peladas/:id/dashboard includes next match and roster count', async () => {
      const sub = 'dash-match';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'm@t.c' });

      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const match = await createMatch(prisma, {
        pelada,
        scheduledAt: future,
      });
      const p1 = await createPlayer(prisma, {
        peladaId: pelada.id,
        displayName: 'Ana',
      });
      const p2 = await createPlayer(prisma, {
        peladaId: pelada.id,
        displayName: 'Bruno',
      });
      await prisma.matchAttendance.createMany({
        data: [
          { matchId: match.id, playerId: p1.id, status: 'CONFIRMED' },
          { matchId: match.id, playerId: p2.id, status: 'CONFIRMED' },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/dashboard`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.rosterPlayerCount).toBe(2);
      expect(res.body.nextMatch.id).toBe(match.id);
      expect(res.body.nextMatch.confirmedCount).toBe(2);
      expect(res.body.nextMatch.confirmedPlayers).toHaveLength(2);
      expect(res.body.nextMatch.capacity).toBeGreaterThan(0);
    });

    it('GET /peladas/:id/dashboard aggregates cash for current UTC month', async () => {
      const sub = 'dash-cash';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const player = await createPlayer(prisma, { peladaId: pelada.id });
      const token = signTestJwt({ sub, email: user.email ?? 'c@sh.c' });

      const now = new Date();
      await prisma.paymentLedger.create({
        data: {
          peladaId: pelada.id,
          playerId: player.id,
          amountCents: 5000,
          status: 'PAID',
          paidAt: now,
        },
      });
      await prisma.paymentLedger.create({
        data: {
          peladaId: pelada.id,
          playerId: player.id,
          amountCents: 3000,
          status: 'PENDING',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/dashboard`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.cashMonth.receivedCents).toBe(5000);
      expect(res.body.cashMonth.expectedCents).toBe(8000);
    });
  },
);
