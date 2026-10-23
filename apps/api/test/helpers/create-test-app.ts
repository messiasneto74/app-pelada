import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureNestApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/prisma/prisma.service';

export type TestAppContext = {
  app: INestApplication<App>;
  prisma: PrismaService;
};

export async function createTestApp(): Promise<TestAppContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureNestApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}
