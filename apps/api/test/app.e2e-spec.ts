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
