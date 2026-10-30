import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createPelada } from './factories/pelada.factory';
import { createUser } from './factories/user.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

(runHarness ? describe : describe.skip)(
  '3.7-API CRUD /peladas/:id/players',
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

    it('GET /peladas/:id/players without token returns 401', async () => {
      const user = await createUser(prisma, { keycloakSub: 'roster-401' });
      const pelada = await createPelada(prisma, { owner: user });

      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/players`)
        .expect(401);
    });

    it('GET /peladas/:id/players returns 404 for unknown pelada', async () => {
      const token = signTestJwt({ sub: 'roster-404', email: 'a@b.c' });

      await request(app.getHttpServer())
        .get('/peladas/unknown-pelada-id/players')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('GET /peladas/:id/players returns 403 for non-member', async () => {
      const org = await createUser(prisma, { keycloakSub: 'roster-org' });
      const outsider = await createUser(prisma, { keycloakSub: 'roster-out' });
      const pelada = await createPelada(prisma, { owner: org });
      const token = signTestJwt({
        sub: 'roster-out',
        email: outsider.email ?? 'o@z.c',
      });

      await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('POST + GET list players for organizador', async () => {
      const sub = 'roster-crud';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'x@y.z' });

      const created = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          displayName: 'Maria Souza',
          isGoalkeeper: true,
          tags: ['reflexo'],
          rating: 7,
        })
        .expect(201);

      expect(created.body).toMatchObject({
        displayName: 'Maria Souza',
        isGoalkeeper: true,
        tags: ['reflexo'],
        rating: 7,
        isFixedList: false,
      });

      const list = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body).toEqual({
        peladaId: pelada.id,
        players: [created.body],
      });
    });

    it('POST isFixedList true returns 400 when fixedListOnly is false', async () => {
      const sub = 'roster-fixed-deny';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'x@y.z' });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Fixo Negado', isFixedList: true })
        .expect(400);
    });

    it('POST isFixedList allowed when fixedListOnly is true', async () => {
      const sub = 'roster-fixed-ok';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      await prisma.peladaRules.update({
        where: { peladaId: pelada.id },
        data: { fixedListOnly: true },
      });
      const token = signTestJwt({ sub, email: user.email ?? 'x@y.z' });

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Mensalista', isFixedList: true })
        .expect(201);

      expect(res.body.isFixedList).toBe(true);
    });

    it('POST /players returns 403 for non-organizador member', async () => {
      const orgSub = 'roster-post-org';
      const jogSub = 'roster-post-jog';
      const org = await createUser(prisma, { keycloakSub: orgSub });
      const jog = await createUser(prisma, { keycloakSub: jogSub });
      const pelada = await createPelada(prisma, { owner: org });
      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: jog.id, role: 'JOGADOR' },
      });
      const token = signTestJwt({ sub: jogSub, email: jog.email ?? 'j@z.c' });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Tentativa' })
        .expect(403);
    });

    it('DELETE /players/:id removes player for organizador', async () => {
      const sub = 'roster-del';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'x@y.z' });

      const created = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Sair da lista' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/peladas/${pelada.id}/players/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/players`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body.players).toHaveLength(0);
    });
  },
);
