import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { MeModule } from '../me/me.module';
import { LiveController } from './live.controller';
import { LiveEventsInterceptor } from './live-events.interceptor';
import { LiveEventsService } from './live-events.service';
import { LiveMemberGuard } from './live-member.guard';

/** Issue #233 — atualização instantânea das telas da pelada. */
@Module({
  imports: [AuthModule, MeModule],
  controllers: [LiveController],
  providers: [
    LiveEventsService,
    LiveMemberGuard,
    { provide: APP_INTERCEPTOR, useClass: LiveEventsInterceptor },
  ],
  exports: [LiveEventsService],
})
export class LiveModule {}
