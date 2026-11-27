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
  describe('3.9-API payments ledger', () => {
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

    it('GET /peladas/:id/payments/ledger without token returns 401', async () => {
      const user = await createUser(prisma, { keycloakSub: 'pay-401' });
      const pelada = await createPelada(prisma, { owner: user });

      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/payments/ledger`)
        .expect(401);
    });

    it('GET /peladas/:id/payments/ledger returns 403 for non-member', async () => {
      const org = await createUser(prisma, { keycloakSub: 'pay-org' });
      await createUser(prisma, { keycloakSub: 'pay-other' });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({ sub: 'pay-other', email: 'o@t.c' });

      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/payments/ledger`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('GET /peladas/:id/payments/ledger returns grouped entries and summary', async () => {
      const sub = 'pay-list';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { extra: { paymentModel: 'PER_MATCH', feeCents: 2000 } },
      });
      const player = await createPlayer(prisma, {
        peladaId: pelada.id,
        displayName: 'Carlos',
      });
      const match = await createMatch(prisma, { pelada });
      const now = new Date();
      await prisma.paymentLedger.create({
        data: {
          peladaId: pelada.id,
          playerId: player.id,
          matchId: match.id,
          amountCents: 2000,
          status: 'PENDING',
          createdAt: now,
        },
      });
      const token = signTestJwt({ sub, email: user.email ?? 'p@y.c' });

      const res = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/payments/ledger?groupBy=player&at=${now.toISOString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.paymentModel).toBe('PER_MATCH');
      expect(res.body.feeCents).toBe(2000);
      expect(res.body.summary.pendingCents).toBe(2000);
      expect(res.body.groups).toHaveLength(1);
      expect(res.body.groups[0].entries[0].playerPaymentPlan).toBe('PER_MATCH');
    });

    it('POST mark-paid returns 403 for non-organizer member', async () => {
      const org = await createUser(prisma, { keycloakSub: 'pay-m-org' });
      const jog = await createUser(prisma, { keycloakSub: 'pay-m-jog' });
      const pelada = await createPelada(prisma, { owner: org });
      const player = await createPlayer(prisma, { peladaId: pelada.id });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: jog.id, role: 'JOGADOR' },
      });
      const ledger = await prisma.paymentLedger.create({
        data: {
          peladaId: pelada.id,
          playerId: player.id,
          amountCents: 1000,
          status: 'PENDING',
        },
      });
      const token = signTestJwt({ sub: 'pay-m-jog', email: 'j@og.c' });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/payments/${ledger.id}/mark-paid`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('POST mark-paid sets PAID and paidAt', async () => {
      const sub = 'pay-mark';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const player = await createPlayer(prisma, { peladaId: pelada.id });
      const ledger = await prisma.paymentLedger.create({
        data: {
          peladaId: pelada.id,
          playerId: player.id,
          amountCents: 1500,
          status: 'PENDING',
        },
      });
      const token = signTestJwt({ sub, email: user.email ?? 'm@rk.c' });

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/payments/${ledger.id}/mark-paid`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBe('PAID');
      expect(res.body.paidAt).toBeTruthy();
    });

    it('POST /payments/ledger creates pending entry (organizer)', async () => {
      const sub = 'pay-create';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const player = await createPlayer(prisma, {
        peladaId: pelada.id,
        displayName: 'Diana',
      });
      const token = signTestJwt({ sub, email: user.email ?? 'c@r.c' });

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/payments/ledger`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playerId: player.id, amountCents: 3000 })
        .expect(201);

      expect(res.body).toMatchObject({
        playerId: player.id,
        amountCents: 3000,
        status: 'PENDING',
        playerName: 'Diana',
      });
    });

    describe('cobrança única por período (issue #231)', () => {
      async function seed(sub: string, paymentModel: string) {
        const user = await createUser(prisma, { keycloakSub: sub });
        const pelada = await createPelada(prisma, { owner: user });
        await prisma.peladaRules.update({
          where: { peladaId: pelada.id },
          data: { extra: { paymentModel } },
        });
        const player = await createPlayer(prisma, { peladaId: pelada.id, displayName: 'Bia' });
        const other = await createPlayer(prisma, { peladaId: pelada.id, displayName: 'Caio' });
        const token = signTestJwt({ sub, email: user.email ?? 'u@r.c' });
        const charge = (body: Record<string, unknown>) =>
          request(app.getHttpServer())
            .post(`/peladas/${pelada.id}/payments/ledger`)
            .set('Authorization', `Bearer ${token}`)
            .send(body);
        return { pelada, player, other, charge };
      }

      it('mensal: segunda cobrança do mesmo jogador no mês é recusada (409)', async () => {
        const { player, other, charge } = await seed('pay-unique-month', 'MONTHLY');
        await charge({ playerId: player.id, amountCents: 5000 }).expect(201);
        const dup = await charge({ playerId: player.id, amountCents: 5000 }).expect(409);
        expect(dup.body.message).toBe('Bia já tem uma cobrança neste mês.');
        await charge({ playerId: other.id, amountCents: 5000 }).expect(201);
      });

      it('semanal: segunda cobrança na semana é recusada; cobrança antiga não conta', async () => {
        const { pelada, player, charge } = await seed('pay-unique-week', 'WEEKLY');
        await prisma.paymentLedger.create({
          data: {
            peladaId: pelada.id,
            playerId: player.id,
            amountCents: 1000,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        });
        await charge({ playerId: player.id, amountCents: 1000 }).expect(201);
        const dup = await charge({ playerId: player.id, amountCents: 1000 }).expect(409);
        expect(dup.body.message).toBe('Bia já tem uma cobrança nesta semana.');
      });

      it('por partida: uma por partida; outra partida pode', async () => {
        const { pelada, player, charge } = await seed('pay-unique-match', 'PER_MATCH');
        const m1 = await createMatch(prisma, { pelada });
        const m2 = await createMatch(prisma, { pelada });
        await charge({ playerId: player.id, matchId: m1.id, amountCents: 2000 }).expect(201);
        const dup = await charge({ playerId: player.id, matchId: m1.id, amountCents: 2000 }).expect(409);
        expect(dup.body.message).toBe('Bia já tem uma cobrança nesta partida.');
        await charge({ playerId: player.id, matchId: m2.id, amountCents: 2000 }).expect(201);
      });
    });
  });
}
