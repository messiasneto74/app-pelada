import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class PhotoStorageService {
  constructor(private readonly config: ConfigService) {}

  assertValidUpload(file: Express.Multer.File | undefined): void {
    if (!file) {
      return;
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Foto deve ser JPG, PNG ou WebP.');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Foto deve ter no máximo 5 MB.');
    }
  }

  async savePeladaPhoto(
    peladaId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.assertValidUpload(file);
    const dir = this.resolveUploadDir();
    await mkdir(dir, { recursive: true });
    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    const filename = `${peladaId}-${randomUUID()}.${ext}`;
    const absolute = join(dir, filename);
    await writeFile(absolute, file.buffer);
    return this.publicUrl(filename);
  }

  resolveUploadDir(): string {
    const raw = this.config.get<string>('UPLOAD_DIR') ?? './uploads';
    return resolve(process.cwd(), raw);
  }

  private publicUrl(filename: string): string {
    const base =
      this.config.get<string>('PUBLIC_UPLOAD_BASE_URL') ??
      'http://localhost:3000/uploads';
    return `${base.replace(/\/$/, '')}/${filename}`;
  }
}
