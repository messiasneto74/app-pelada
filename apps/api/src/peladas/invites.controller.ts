import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/auth-user';
import { SendInviteEmailDto } from './dto/send-invite-email.dto';
import { PeladaInvitesService } from './pelada-invites.service';

@Controller()
export class InvitesController {
  constructor(private readonly invitesService: PeladaInvitesService) {}

  @Post('peladas/:peladaId/invites')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createInvite(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
  ) {
    return this.invitesService.createInvite(user, peladaId);
  }

  @Get('invites/:token')
  previewInvite(@Param('token') token: string) {
    return this.invitesService.previewInvite(token);
  }

  /** Issue #179b — reenvia o convite já existente (mesmo token) por e-mail. */
  @Post('invites/:token/send-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  sendInviteEmail(
    @CurrentUser() user: AuthUserPayload,
    @Param('token') token: string,
    @Body() body: SendInviteEmailDto,
  ) {
    return this.invitesService.sendInviteEmail(user, token, body.email);
  }

  @Post('invites/:token/redeem')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  redeemInvite(
    @CurrentUser() user: AuthUserPayload,
    @Param('token') token: string,
  ) {
    return this.invitesService.redeemInvite(user, token);
  }
}
