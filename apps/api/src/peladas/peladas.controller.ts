import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { CreatePeladaDto } from './dto/create-pelada.dto';
import { PeladasService } from './peladas.service';

const photoUpload = memoryStorage();
const maxPhotoBytes = 5 * 1024 * 1024;

@Controller()
export class PeladasController {
  constructor(private readonly peladasService: PeladasService) {}

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
}
