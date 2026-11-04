import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeModule } from '../me/me.module';
import { MatchAttendanceService } from './match-attendance.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [AuthModule, MeModule],
  controllers: [MatchesController],
  providers: [MatchesService, MatchAttendanceService],
})
export class MatchesModule {}
