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
  '3.3-API POST /peladas/:id/matches',
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

    it('POST /matches without token returns 401', async () => {
      const user = await createUser(prisma, { keycloakSub: 'match-401' });
      const pelada = await createPelada(prisma, { owner: user });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches`)
        .send({ scheduledAt: new Date().toISOString() })
        .expect(401);
    });

    it('POST /matches returns 403 for non-organizador', async () => {
      const sub = 'match-403';
      const org = await createUser(prisma, { keycloakSub: `${sub}-org` });
      const member = await createUser(prisma, { keycloakSub: `${sub}-mem` });
      const pelada = await createPelada(prisma, { owner: org });
      const memberToken = signTestJwt({
        sub: `${sub}-mem`,
        email: member.email ?? 'm@y.z',
      });

      await prisma.peladaMember.create({
        data: { peladaId: pelada.id, userId: member.id, role: 'JOGADOR' },
      });

      await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ scheduledAt: '2030-06-01T19:00:00.000Z' })
        .expect(403);
    });

    it('POST /matches creates match with rules snapshot', async () => {
      const sub = 'match-create';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'o@y.z' });

      const res = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          scheduledAt: '2030-08-15T22:30:00.000Z',
          location: 'Society',
          notes: 'Colete claro',
          presenceMode: 'SELF_CONFIRM',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        peladaId: pelada.id,
        location: 'Society',
        notes: 'Colete claro',
        presenceMode: 'SELF_CONFIRM',
        status: 'SCHEDULED',
      });

      const stored = await prisma.match.findUnique({
        where: { id: res.body.id },
      });
      expect(stored?.rulesOverride).toMatchObject({
        playersPerTeam: 6,
        teamCount: 2,
        rulesSnapshotAt: expect.any(String),
      });
    });

    it('GET match rules keeps snapshot after pelada rules change', async () => {
      const sub = 'match-snap';
      const user = await createUser(prisma, { keycloakSub: sub });
      const pelada = await createPelada(prisma, { owner: user });
      const token = signTestJwt({ sub, email: user.email ?? 'o@y.z' });

      const created = await request(app.getHttpServer())
        .post(`/peladas/${pelada.id}/matches`)
        .set('Authorization', `Bearer ${token}`)
        .send({ scheduledAt: '2030-09-01T19:00:00.000Z' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/peladas/${pelada.id}/rules`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playersPerTeam: 8 })
        .expect(200);

      const rulesView = await request(app.getHttpServer())
        .get(`/peladas/${pelada.id}/matches/${created.body.id}/rules`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(rulesView.body.effectiveRules.playersPerTeam).toBe(6);
      expect(rulesView.body.defaultRules.playersPerTeam).toBe(8);
    });
  },
);
