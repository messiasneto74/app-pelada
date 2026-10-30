import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CreatePlayerDto } from '../domain/dto/create-player.dto';
import { PatchPeladaRulesDto } from '../domain/dto/patch-pelada-rules.dto';
import { PatchPlayerDto } from '../domain/dto/patch-player.dto';
import { CreatePeladaDto } from './dto/create-pelada.dto';
import { PeladaPlayersService } from './pelada-players.service';
import { PeladasService } from './peladas.service';

const photoUpload = memoryStorage();
const maxPhotoBytes = 5 * 1024 * 1024;

@Controller()
export class PeladasController {
  constructor(
    private readonly peladasService: PeladasService,
    private readonly peladaPlayersService: PeladaPlayersService,
  ) {}

  @Post('peladas')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: photoUpload,
      limits: { fileSize: maxPhotoBytes },
    }),
  )
  createPelada(
    @CurrentUser() user: AuthUserPayload,
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Body() body: CreatePeladaDto,
  ) {
    return this.peladasService.createPelada(user, body, photo);
  }

  @Get('peladas/:peladaId/rules')
  @UseGuards(JwtAuthGuard)
  getPeladaRules(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
  ) {
    return this.peladasService.getPeladaRules(user, peladaId);
  }

  @Patch('peladas/:peladaId/rules')
  @UseGuards(JwtAuthGuard)
  patchPeladaRules(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Body() body: PatchPeladaRulesDto,
  ) {
    return this.peladasService.patchPeladaRules(user, peladaId, body);
  }

  @Get('peladas/:peladaId/dashboard')
  @UseGuards(JwtAuthGuard)
  getPeladaDashboard(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
  ) {
    return this.peladasService.getPeladaDashboard(user, peladaId);
  }

  @Get('peladas/:peladaId/players')
  @UseGuards(JwtAuthGuard)
  listPeladaPlayers(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
  ) {
    return this.peladaPlayersService.listPlayers(user, peladaId);
  }

  @Get('peladas/:peladaId/players/:playerId')
  @UseGuards(JwtAuthGuard)
  getPeladaPlayer(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.peladaPlayersService.getPlayer(user, peladaId, playerId);
  }

  @Post('peladas/:peladaId/players')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  createPeladaPlayer(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Body() body: CreatePlayerDto,
  ) {
    return this.peladaPlayersService.createPlayer(user, peladaId, body);
  }

  @Patch('peladas/:peladaId/players/:playerId')
  @UseGuards(JwtAuthGuard)
  patchPeladaPlayer(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('playerId') playerId: string,
    @Body() body: PatchPlayerDto,
  ) {
    return this.peladaPlayersService.patchPlayer(user, peladaId, playerId, body);
  }

  @Delete('peladas/:peladaId/players/:playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deletePeladaPlayer(
    @CurrentUser() user: AuthUserPayload,
    @Param('peladaId') peladaId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.peladaPlayersService.deletePlayer(user, peladaId, playerId);
  }
}
