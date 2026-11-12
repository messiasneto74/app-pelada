import { access } from 'node:fs/promises';
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

function uploadPathFromPublicUrl(photoUrl: string): string {
  const url = new URL(photoUrl);
  return url.pathname;
}

if (runHarness) {
  describe('STORAGE-1 uploads (filesystem)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let uploadDir: string;

    beforeAll(async () => {
      uploadDir = await mkdtemp(join(tmpdir(), 'pelada-storage-'));
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

    it('POST /peladas com foto: 201, GET /uploads/*', async () => {
      const token = signTestJwt({ sub: 'st-pelada', email: 'st@pelada.test' });

      const res = await request(app.getHttpServer())
        .post('/peladas')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Pelada storage')
        .attach('photo', Buffer.from('jpeg-bytes'), {
          filename: 'capa.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.photoUrl).toMatch(/\/uploads\/.+\.jpg$/);

      const path = uploadPathFromPublicUrl(res.body.photoUrl);
      await request(app.getHttpServer()).get(path).expect(200);
    });

    it('POST /peladas rejeita foto maior que 5 MB com 413', async () => {
      const token = signTestJwt({ sub: 'st-big', email: 'big@pelada.test' });
      const huge = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

      const res = await request(app.getHttpServer())
        .post('/peladas')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Pelada grande')
        .attach('photo', huge, {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);

      expect(res.body.message).toContain('5 MB');
    });

    it('PATCH player com foto: 200, arquivo no disco e GET /uploads/*', async () => {
      const token = signTestJwt({ sub: 'st-player', email: 'pl@pelada.test' });

      const peladaRes = await request(app.getHttpServer())
        .post('/peladas')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Elenco foto')
        .expect(201);

      const peladaId = peladaRes.body.id as string;

      const created = await request(app.getHttpServer())
        .post(`/peladas/${peladaId}/players`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Zé Foto' })
        .expect(201);

      const playerId = created.body.id as string;

      const patched = await request(app.getHttpServer())
        .patch(`/peladas/${peladaId}/players/${playerId}`)
        .set('Authorization', `Bearer ${token}`)
        .attach('photo', Buffer.from('player-jpeg'), {
          filename: 'ze.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(patched.body.photoUrl).toMatch(/\/uploads\/player-.+\.jpg$/);

      const path = uploadPathFromPublicUrl(patched.body.photoUrl);
      await request(app.getHttpServer()).get(path).expect(200);

      const filename = path.replace(/^\/uploads\//, '');
      await access(join(uploadDir, filename));
    });
  });
}
