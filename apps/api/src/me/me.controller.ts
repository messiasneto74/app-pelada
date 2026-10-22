import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth-user';
import { PatchMeDto } from './patch-me.dto';
import { MeService } from './me.service';

@Controller()
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUserPayload) {
    return this.meService.getMe(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  patchMe(@CurrentUser() user: AuthUserPayload, @Body() body: PatchMeDto) {
    return this.meService.patchMe(user, body);
  }
}
