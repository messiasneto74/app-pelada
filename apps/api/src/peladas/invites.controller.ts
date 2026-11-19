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
import { CreateInviteDto } from './dto/create-invite.dto';
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
    @Body() body: CreateInviteDto,
  ) {
    return this.invitesService.createInvite(user, peladaId, body.email);
  }

  @Get('invites/:token')
  previewInvite(@Param('token') token: string) {
    return this.invitesService.previewInvite(token);
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
