import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            ping: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns ok when database is up', async () => {
      await expect(controller.health()).resolves.toEqual({
        status: 'ok',
        service: 'pelada-api',
        database: 'ok',
      });
    });
  });
});
