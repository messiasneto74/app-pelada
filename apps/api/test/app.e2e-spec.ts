import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureNestApp } from './../src/bootstrap';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        ping: jest.fn().mockResolvedValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'pelada-api',
        database: 'ok',
      });
  });

  it('respostas incluem cabeçalhos de segurança do helmet (Médio)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('confia em 1 hop de proxy (achado de segurança do Codex no PR #128): sem isso, o throttler trataria todo mundo atrás do reverse proxy de staging como o mesmo IP', () => {
    const expressApp = app.getHttpAdapter().getInstance() as {
      get(setting: string): unknown;
    };
    expect(expressApp.get('trust proxy')).toBe(1);
  });

  it('corpo acima do limite configurado (1mb) retorna 413 (Médio)', () => {
    const big = { name: 'x'.repeat(2 * 1024 * 1024) };
    return request(app.getHttpServer())
      .post('/_probe/validate')
      .send(big)
      .expect(413);
  });

  it('corpo entre o default do Express (100kb) e o limite configurado (1mb) passa (Médio)', () => {
    const mid = { name: 'x'.repeat(500 * 1024) };
    return request(app.getHttpServer())
      .post('/_probe/validate')
      .send(mid)
      .expect(201);
  });

  it('unknown route returns standard error body', () => {
    return request(app.getHttpServer())
      .get('/rota-inexistente')
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          path: '/rota-inexistente',
        });
        expect(res.body.message).toBeDefined();
        expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
  });

  it('validation pipe returns 400 with standard error body', () => {
    return request(app.getHttpServer())
      .post('/_probe/validate')
      .send({ name: '', extra: 'x' })
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          path: '/_probe/validate',
        });
        expect(res.body.message).toBeDefined();
        expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
  });
});
