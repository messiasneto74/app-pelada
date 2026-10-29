import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../auth/auth-user';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoStorageService } from '../storage/photo-storage.service';
import { CreatePeladaDto } from './dto/create-pelada.dto';

export type PeladaCreatedResponse = {
  id: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
};

@Injectable()
export class PeladasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
    private readonly photoStorage: PhotoStorageService,
  ) {}

  async createPelada(
    auth: AuthUserPayload,
    dto: CreatePeladaDto,
    photo?: Express.Multer.File,
  ): Promise<PeladaCreatedResponse> {
    if (photo) {
      this.photoStorage.assertValidUpload(photo);
    }

    const user = await this.meService.getOrCreateUser(auth);

    const pelada = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pelada.create({
        data: {
          name: dto.name.trim(),
          ownerId: user.id,
          defaultWeekday: dto.defaultWeekday ?? null,
          defaultLocation: dto.defaultLocation?.trim() || null,
          members: {
            create: {
              userId: user.id,
              role: 'ORGANIZADOR',
            },
          },
          rules: {
            create: {},
          },
        },
      });

      let photoUrl: string | null = null;
      if (photo) {
        photoUrl = await this.photoStorage.savePeladaPhoto(created.id, photo);
        return tx.pelada.update({
          where: { id: created.id },
          data: { photoUrl },
        });
      }

      return created;
    });

    return {
      id: pelada.id,
      name: pelada.name,
      photoUrl: pelada.photoUrl,
      defaultWeekday: pelada.defaultWeekday,
      defaultLocation: pelada.defaultLocation,
    };
  }
}
