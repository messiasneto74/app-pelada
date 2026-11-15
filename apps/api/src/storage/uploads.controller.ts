import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhotoStorageService } from './photo-storage.service';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Nome de arquivo gerado por `PhotoStorageService` — sem barras ou `..`. */
const SAFE_FILENAME = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;

/**
 * Fotos (pelada/jogador) exigem login — antes eram servidas como arquivo
 * estático público, sem nenhuma checagem (achado da auditoria, 2026-11-15).
 * Qualquer conta autenticada no app pode ver; não é restrito por pelada.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly photoStorage: PhotoStorageService) {}

  @Get(':filename')
  @UseGuards(JwtAuthGuard)
  getUpload(@Param('filename') filename: string, @Res() res: Response): void {
    if (!SAFE_FILENAME.test(filename)) {
      throw new NotFoundException('Arquivo não encontrado.');
    }
    const dir = this.photoStorage.resolveUploadDir();
    const absolute = join(dir, filename);
    if (!existsSync(absolute)) {
      throw new NotFoundException('Arquivo não encontrado.');
    }
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    res.setHeader(
      'Content-Type',
      CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream',
    );
    createReadStream(absolute).pipe(res);
  }
}
