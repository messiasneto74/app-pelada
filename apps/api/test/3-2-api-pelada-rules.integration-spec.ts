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

(runHarness ? describe : describe.skip)('3.2-API GET/PATCH /peladas/:id/rules', () => {
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

  it('GET /peladas/:id/rules without token returns 401', async () => {
    const user = await createUser(prisma, { keycloakSub: 'rules-401' });
    const pelada = await createPelada(prisma, { owner: user });

    await request(app.getHttpServer())
      .get(`/peladas/${pelada.id}/rules`)
      .expect(401);
  });

  it('GET /peladas/:id/rules returns 404 for unknown pelada', async () => {
    const token = signTestJwt({ sub: 'rules-404', email: 'a@b.c' });

    await request(app.getHttpServer())
      .get('/peladas/unknown-pelada-id/rules')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /peladas/:id/rules returns rules for member', async () => {
    const sub = 'rules-get';
    const user = await createUser(prisma, { keycloakSub: sub });
    const pelada = await createPelada(prisma, { owner: user });
    const token = signTestJwt({ sub, email: user.email ?? 'x@y.z' });

    const res = await request(app.getHttpServer())
      .get(`/peladas/${pelada.id}/rules`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      peladaId: pelada.id,
      playersPerTeam: 6,
      teamCount: 2,
      goalkeeperMode: 'ROTATING',
    });
  });

  it('PATCH /peladas/:id/rules returns 403 for non-organizador', async () => {
    const orgSub = 'rules-org';
    const jogSub = 'rules-jog';
    const org = await createUser(prisma, { keycloakSub: orgSub });
    const jog = await createUser(prisma, { keycloakSub: jogSub });
    const pelada = await createPelada(prisma, { owner: org });
    await prisma.peladaMember.create({
      data: { peladaId: pelada.id, userId: jog.id, role: 'JOGADOR' },
    });

    const token = signTestJwt({ sub: jogSub, email: jog.email ?? 'j@z.c' });

    await request(app.getHttpServer())
      .patch(`/peladas/${pelada.id}/rules`)
      .set('Authorization', `Bearer ${token}`)
      .send({ playersPerTeam: 5 })
      .expect(403);
  });

  it('PATCH rejects conflicting GK flags in extra', async () => {
    const sub = 'rules-gk-bad';
    const user = await createUser(prisma, { keycloakSub: sub });
    const pelada = await createPelada(prisma, { owner: user });
    const token = signTestJwt({ sub, email: user.email ?? 'g@k.c' });

    await request(app.getHttpServer())
      .patch(`/peladas/${pelada.id}/rules`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        extra: { goalkeeperPerTeam: true, fixedGoalkeeper: true },
      })
      .expect(400);
  });

  it('PATCH updates rules for organizador', async () => {
    const sub = 'rules-patch-ok';
    const user = await createUser(prisma, { keycloakSub: sub });
    const pelada = await createPelada(prisma, { owner: user });
    const token = signTestJwt({ sub, email: user.email ?? 'p@k.c' });

    const res = await request(app.getHttpServer())
      .patch(`/peladas/${pelada.id}/rules`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        playersPerTeam: 7,
        drawWeights: { mode: 'BALANCED', useRating: true },
      })
      .expect(200);

    expect(res.body.playersPerTeam).toBe(7);
    expect(res.body.drawWeights).toMatchObject({ mode: 'BALANCED' });
  });
});
