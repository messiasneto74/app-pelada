import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth-user';
import { PatchMatchRulesOverrideDto } from '../domain/dto/patch-match-rules-override.dto';
import { MatchesService } from './matches.service';

@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

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
