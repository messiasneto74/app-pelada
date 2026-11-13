import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MeModule } from './me/me.module';
import { PeladasModule } from './peladas/peladas.module';
import { MatchesModule } from './matches/matches.module';
import { ProbeModule } from './probe/probe.module';

/** Monorepo: `.env` na raiz; npm -w roda com cwd em `apps/api`. */
function resolveEnvFilePaths(): string[] {
  const candidates = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '..', '.env'),
    join(__dirname, '..', '..', '..', '.env'),
    join(__dirname, '..', '.env'),
  ];
  return [...new Set(candidates)].filter((p) => existsSync(p));
}

/** `/_probe/*` é um DTO de teste — nunca deve existir em produção (Médio). */
export function shouldExposeProbeModule(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}

const nonProductionModules = shouldExposeProbeModule(process.env.NODE_ENV)
  ? [ProbeModule]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePaths(),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    MeModule,
    PeladasModule,
    MatchesModule,
    ...nonProductionModules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
