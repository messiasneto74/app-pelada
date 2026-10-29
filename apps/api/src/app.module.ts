import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePaths(),
    }),
    PrismaModule,
    MeModule,
    PeladasModule,
    MatchesModule,
    ProbeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
