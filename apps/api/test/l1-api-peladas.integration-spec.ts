import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/reset-database';
import { signTestJwt } from './helpers/sign-test-jwt';

const runHarness =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL_TEST;

(runHarness ? describe : describe.skip)('L1-API POST /peladas', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'pelada-upload-'));
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PUBLIC_UPLOAD_BASE_URL = 'http://localhost:3000/uploads';
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('POST /peladas without token returns 401', () => {
    return request(app.getHttpServer())
      .post('/peladas')
      .field('name', 'Pelada teste')
      .expect(401);
  });

  it('POST /peladas creates pelada and ORGANIZADOR member', async () => {
    const token = signTestJwt({ sub: 'org-sub', email: 'org@pelada.test' });

    const res = await request(app.getHttpServer())
      .post('/peladas')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Pelada da Praça')
      .field('defaultWeekday', '3')
      .field('defaultLocation', 'Campo Zé')
      .expect(201);

    expect(res.body).toMatchObject({
      name: 'Pelada da Praça',
      defaultWeekday: 3,
      defaultLocation: 'Campo Zé',
      photoUrl: null,
    });

    const member = await prisma.peladaMember.findFirst({
      where: { peladaId: res.body.id },
    });
    expect(member?.role).toBe('ORGANIZADOR');
  });

  it('POST /peladas rejects short name', async () => {
    const token = signTestJwt({ sub: 'bad-name', email: 'a@b.c' });

    await request(app.getHttpServer())
      .post('/peladas')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'A')
      .expect(400);
  });

  it('POST /peladas accepts photo upload', async () => {
    const token = signTestJwt({ sub: 'photo-sub', email: 'photo@pelada.test' });

    const res = await request(app.getHttpServer())
      .post('/peladas')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Com foto')
      .attach('photo', Buffer.from('fakejpeg'), {
        filename: 'pelada.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(res.body.photoUrl).toMatch(/\/uploads\/.+\.jpg$/);
  });
});
