import { ConflictException, INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureNestApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { KeycloakAdminClient } from '../src/register/keycloak-admin.client';

describe('Register (e2e)', () => {
  let app: INestApplication<App>;
  const createUser = jest.fn();

  beforeEach(async () => {
    createUser.mockReset();
    process.env.DEV_AUTH_BYPASS = 'true';

    const prismaMock = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      ping: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(KeycloakAdminClient)
      .useValue({ createUser })
      .compile();

    app = moduleFixture.createNestApplication();
    configureNestApp(app);
    await app.init();
  });

  afterEach(async () => {
    delete process.env.DEV_AUTH_BYPASS;
    await app.close();
  });

  it('POST /register 201 no happy path', async () => {
    createUser.mockResolvedValue(undefined);
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({
        email: 'nova@pelada.local',
        password: 'senha-valida',
        name: 'Ana Silva',
      })
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    expect(createUser).toHaveBeenCalledWith({
      email: 'nova@pelada.local',
      password: 'senha-valida',
      name: 'Ana Silva',
    });
  });

  it('POST /register 400 sem nome e sobrenome', async () => {
    await request(app.getHttpServer())
      .post('/register')
      .send({
        email: 'nova@pelada.local',
        password: 'senha-valida',
        name: 'Ana',
      })
      .expect(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('POST /register 400 senha curta', async () => {
    await request(app.getHttpServer())
      .post('/register')
      .send({
        email: 'nova@pelada.local',
        password: 'curta',
        name: 'Ana Silva',
      })
      .expect(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('POST /register 409 quando e-mail já existe', async () => {
    createUser.mockRejectedValue(
      new ConflictException('Já existe uma conta com este e-mail.'),
    );
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({
        email: 'dup@pelada.local',
        password: 'senha-valida',
        name: 'Ana Silva',
      })
      .expect(409);
    expect(res.body.message).toMatch(/conta/i);
  });

  it('POST /register 503 quando Admin não configurado', async () => {
    createUser.mockRejectedValue(
      new ServiceUnavailableException(
        'Cadastro indisponível: Keycloak Admin não configurado.',
      ),
    );
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({
        email: 'nova@pelada.local',
        password: 'senha-valida',
        name: 'Ana Silva',
      })
      .expect(503);
    expect(res.body.message).toMatch(/Keycloak Admin/i);
  });
});
