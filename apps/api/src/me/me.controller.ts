import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth-user';
import { ChangePasswordDto } from './change-password.dto';
import { MeProfileService } from './me-profile.service';
import { PatchMeDto } from './patch-me.dto';
import { MeService } from './me.service';

@Controller()
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly profile: MeProfileService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUserPayload) {
    return this.meService.getMe(user);
  }

  @Get('me/peladas')
  @UseGuards(JwtAuthGuard)
  listMyPeladas(@CurrentUser() user: AuthUserPayload) {
    return this.meService.listMyPeladas(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async patchMe(@CurrentUser() user: AuthUserPayload, @Body() body: PatchMeDto) {
    // Issue #226 — nome vai pro Keycloak e pros jogadores vinculados.
    if (body.name !== undefined) {
      await this.profile.updateName(user, body.name);
    }
    return this.meService.patchMe(user, body);
  }

  /** Issue #226 — foto da conta (multipart, campo `photo`). */
  @Post('me/photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  updatePhoto(
    @CurrentUser() user: AuthUserPayload,
    @UploadedFile() photo: Express.Multer.File | undefined,
  ) {
    return this.profile.updatePhoto(user, photo);
  }

  /** Issue #226 — trocar senha (confere a atual antes). */
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: AuthUserPayload, @Body() body: ChangePasswordDto) {
    return this.profile.changePassword(user, body);
  }
}
