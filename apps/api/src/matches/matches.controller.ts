import { Controller, Get, Param, Patch, Body, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth-user';
import { CreateMatchDto } from '../domain/dto/create-match.dto';
import { PatchMatchRulesOverrideDto } from '../domain/dto/patch-match-rules-override.dto';
import { MatchesService } from './matches.service';

@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

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
}
