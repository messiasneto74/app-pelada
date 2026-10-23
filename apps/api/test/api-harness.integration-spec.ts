import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createPelada } from './factories/pelada.factory';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

(runHarness ? describe : describe.skip)(
  'API harness (Postgres + mock JWT)',
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

    it('GET /health reports database ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toMatchObject({
        status: 'ok',
        service: 'pelada-api',
        database: 'ok',
      });
    });

    it('GET /me without token returns 401', () => {
      return request(app.getHttpServer()).get('/me').expect(401);
    });

    it('GET /me with mock Keycloak JWT JIT-creates user', async () => {
      const sub = 'harness-jit-sub';
      const token = signTestJwt({ sub, email: 'jit@pelada.test' });

      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        keycloakSub: sub,
        email: 'jit@pelada.test',
        phone: null,
      });

      const row = await prisma.user.findUnique({ where: { keycloakSub: sub } });
      expect(row).not.toBeNull();
    });

    it('factory can persist Pelada with ORGANIZADOR member', async () => {
      const pelada = await createPelada(prisma, { name: 'Quinta no campinho' });

      expect(pelada.members).toHaveLength(1);
      expect(pelada.members[0].role).toBe('ORGANIZADOR');
      expect(pelada.owner.id).toBe(pelada.ownerId);
    });
  },
);
