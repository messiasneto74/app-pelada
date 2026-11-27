import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureNestApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/prisma/prisma.service';

export type TestAppContext = {
  app: INestApplication<App>;
  prisma: PrismaService;
};

export async function createTestApp(
  overrides: Array<[unknown, unknown]> = [],
): Promise<TestAppContext> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });
  // Ex.: trocar o KeycloakAdminClient por um fake nos testes do Meu perfil (#226).
  for (const [token, value] of overrides) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  const moduleFixture: TestingModule = await builder
    // O limite global (120 req/min por IP) é proteção de produção. Nos testes
    // de integração todas as requisições saem do mesmo IP em poucos segundos e
    // as suítes maiores estouravam com 429 de forma intermitente (issue #217).
    .overrideProvider(ThrottlerStorage)
    .useValue(neverBlockingThrottlerStorage)
    .compile();

  const app = moduleFixture.createNestApplication();
  configureNestApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

const neverBlockingThrottlerStorage = {
  increment: async (_key: string, ttl: number) => ({
    totalHits: 1,
    timeToExpire: Math.ceil(ttl / 1000),
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
};
