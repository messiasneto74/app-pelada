import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth-user';
import { CreateMatchDto } from '../domain/dto/create-match.dto';
import { GuestAttendanceRequestDto } from '../domain/dto/guest-attendance-request.dto';
import { PatchMatchRulesOverrideDto } from '../domain/dto/patch-match-rules-override.dto';
import { SelfAttendanceDto } from '../domain/dto/self-attendance.dto';
import { UpdateAttendanceDto } from '../domain/dto/update-attendance.dto';
import { PostMatchDrawDto } from '../domain/dto/post-match-draw.dto';
import { PatchDrawSwapDto } from '../domain/dto/patch-draw-swap.dto';
import { MatchAttendanceService } from './match-attendance.service';
import { PatchMatchFieldSessionDto } from '../domain/dto/patch-match-field-session.dto';
import { PostMatchFieldSessionDto } from '../domain/dto/post-match-field-session.dto';
import { MatchDrawService } from './match-draw.service';
import { MatchFieldSessionService } from './match-field-session.service';
import { MatchesService } from './matches.service';

@Controller()
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly attendanceService: MatchAttendanceService,
    private readonly drawService: MatchDrawService,
    private readonly fieldSessionService: MatchFieldSessionService,
  ) {}

  @Post('peladas/:peladaId/matches')
  @UseGuards(JwtAuthGuard)
  createMatch(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Body() body: CreateMatchDto,
  ) {
    return this.matchesService.createMatch(user, peladaId, body);
  }

  @Get('peladas/:peladaId/matches/:matchId/rules')
  @UseGuards(JwtAuthGuard)
  getMatchRules(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.matchesService.getMatchRules(user, peladaId, matchId);
  }

  @Patch('peladas/:peladaId/matches/:matchId/rules-override')
  @UseGuards(JwtAuthGuard)
  patchMatchRulesOverride(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: PatchMatchRulesOverrideDto,
  ) {
    return this.matchesService.patchMatchRulesOverride(
      user,
      peladaId,
      matchId,
      body,
    );
  }

  @Get('peladas/:peladaId/matches/:matchId/attendance')
  @UseGuards(JwtAuthGuard)
  listAttendance(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.attendanceService.listAttendance(user, peladaId, matchId);
  }

  @Patch('peladas/:peladaId/matches/:matchId/attendance/:playerId')
  @UseGuards(JwtAuthGuard)
  patchAttendance(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Param('playerId') playerId: string,
    @Body() body: UpdateAttendanceDto,
  ) {
    return this.attendanceService.patchPlayerAttendance(
      user,
      peladaId,
      matchId,
      playerId,
      body,
    );
  }

  @Post('peladas/:peladaId/matches/:matchId/attendance/self')
  @UseGuards(JwtAuthGuard)
  selfAttendance(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: SelfAttendanceDto,
  ) {
    return this.attendanceService.selfAttendance(user, peladaId, matchId, body);
  }

  @Post('peladas/:peladaId/matches/:matchId/attendance/guests')
  @UseGuards(JwtAuthGuard)
  requestGuest(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: GuestAttendanceRequestDto,
  ) {
    return this.attendanceService.requestGuest(user, peladaId, matchId, body);
  }

  @Post('peladas/:peladaId/matches/:matchId/attendance/guests/:playerId/approve')
  @UseGuards(JwtAuthGuard)
  approveGuest(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.attendanceService.approveGuest(user, peladaId, matchId, playerId);
  }

  @Post('peladas/:peladaId/matches/:matchId/attendance/guests/:playerId/decline')
  @UseGuards(JwtAuthGuard)
  declineGuest(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.attendanceService.declineGuest(user, peladaId, matchId, playerId);
  }

  @Post('peladas/:peladaId/matches/:matchId/attendance/close-list')
  @UseGuards(JwtAuthGuard)
  closeList(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.attendanceService.closeList(user, peladaId, matchId);
  }

  @Post('peladas/:peladaId/matches/:matchId/attendance/reopen-list')
  @UseGuards(JwtAuthGuard)
  reopenList(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.attendanceService.reopenList(user, peladaId, matchId);
  }

  @Get('peladas/:peladaId/matches/:matchId/draw')
  @UseGuards(JwtAuthGuard)
  getDraw(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.drawService.getDraw(user, peladaId, matchId);
  }

  @Post('peladas/:peladaId/matches/:matchId/draw')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  postDraw(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: PostMatchDrawDto,
  ) {
    return this.drawService.postDraw(user, peladaId, matchId, body);
  }

  @Patch('peladas/:peladaId/matches/:matchId/draw/swap')
  @UseGuards(JwtAuthGuard)
  patchDrawSwap(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: PatchDrawSwapDto,
  ) {
    return this.drawService.patchSwap(user, peladaId, matchId, body);
  }

  @Get('peladas/:peladaId/matches/:matchId/field-session')
  @UseGuards(JwtAuthGuard)
  getFieldSession(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.fieldSessionService.getSession(user, peladaId, matchId);
  }

  @Post('peladas/:peladaId/matches/:matchId/field-session')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  postFieldSession(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: PostMatchFieldSessionDto,
  ) {
    return this.fieldSessionService.startSession(user, peladaId, matchId, body);
  }

  @Patch('peladas/:peladaId/matches/:matchId/field-session')
  @UseGuards(JwtAuthGuard)
  patchFieldSession(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
    @Body() body: PatchMatchFieldSessionDto,
  ) {
    return this.fieldSessionService.patchSession(user, peladaId, matchId, body);
  }

  @Post('peladas/:peladaId/matches/:matchId/field-session/end-round')
  @UseGuards(JwtAuthGuard)
  postFieldSessionEndRound(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.fieldSessionService.endRound(user, peladaId, matchId);
  }

  @Post('peladas/:peladaId/matches/:matchId/field-session/finish')
  @UseGuards(JwtAuthGuard)
  postFieldSessionFinish(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('matchId') matchId: string,
  ) {
    return this.fieldSessionService.finishSession(user, peladaId, matchId);
  }
}
