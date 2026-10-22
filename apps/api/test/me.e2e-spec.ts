import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureNestApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import type { User } from '@prisma/client';

describe('Me (e2e)', () => {
  let app: INestApplication<App>;
  let userStore: User | null = null;
  const sub = 'e2e-keycloak-sub';

  beforeEach(async () => {
    userStore = null;
    process.env.DEV_AUTH_BYPASS = 'true';
    process.env.DEV_AUTH_SUB = sub;

    const prismaMock = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      ping: jest.fn().mockResolvedValue(true),
      user: {
        upsert: jest.fn(async ({ where, create, update }) => {
          if (!userStore) {
            userStore = {
              id: 'user-e2e-1',
              keycloakSub: create.keycloakSub,
              email: create.email ?? null,
              phone: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            return userStore;
          }
          userStore = {
            ...userStore,
            ...update,
            keycloakSub: where.keycloakSub,
          };
          return userStore;
        }),
        findUnique: jest.fn(async ({ where }) => {
          if (!userStore || userStore.keycloakSub !== where.keycloakSub) {
            return null;
          }
          return userStore;
        }),
        update: jest.fn(async ({ where, data }) => {
          if (!userStore || userStore.keycloakSub !== where.keycloakSub) {
            throw new Error('not found');
          }
          userStore = { ...userStore, ...data, updatedAt: new Date() };
          return userStore;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();
  });

  afterEach(async () => {
    delete process.env.DEV_AUTH_BYPASS;
    delete process.env.DEV_AUTH_SUB;
    await app.close();
  });

  it('GET /me without token returns 401', () => {
    return request(app.getHttpServer()).get('/me').expect(401);
  });

  it('GET /me with dev bypass creates JIT profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer dev-token')
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'user-e2e-1',
      keycloakSub: sub,
      email: 'dev@pelada.local',
      phone: null,
    });
  });

  it('PATCH /me updates phone', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer dev-token')
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', 'Bearer dev-token')
      .send({ phone: '11988887777' })
      .expect(200);

    expect(res.body.phone).toBe('11988887777');
  });

  it('GET /me with invalid token when bypass off returns 401', async () => {
    process.env.DEV_AUTH_BYPASS = 'false';

    return request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(401);
  });
});
