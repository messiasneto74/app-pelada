import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  service: string;
  database: 'ok' | 'down';
};

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const dbOk = await this.prisma.ping();
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'pelada-api',
      database: dbOk ? 'ok' : 'down',
    };
  }
}
