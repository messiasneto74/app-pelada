import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { KeycloakAdminClient } from '../register/keycloak-admin.client';
import { PhotoStorageService } from '../storage/photo-storage.service';
import type { ChangePasswordDto } from './change-password.dto';
import { MeService, type MeResponse } from './me.service';

/**
 * Issue #226 — operações da tela "Meu perfil": nome (Keycloak + jogadores
 * vinculados), foto (conta + jogadores vinculados) e troca de senha.
 */
@Injectable()
export class MeProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly me: MeService,
    private readonly keycloak: KeycloakAdminClient,
    private readonly photos: PhotoStorageService,
  ) {}

  async updateName(auth: AuthUserPayload, rawName: string): Promise<void> {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (name.length < 3) {
      throw new BadRequestException('Informe nome e sobrenome');
    }
    const user = await this.me.getOrCreateUser(auth);
    await this.keycloak.updateUserName(auth.sub, name);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { name } }),
      // O nome da conta vale em todas as peladas da pessoa.
      this.prisma.player.updateMany({ where: { userId: user.id }, data: { displayName: name } }),
    ]);
  }

  async updatePhoto(auth: AuthUserPayload, file: Express.Multer.File | undefined): Promise<MeResponse> {
    if (!file) {
      throw new BadRequestException('Envie uma foto (JPG, PNG ou WebP).');
    }
    const user = await this.me.getOrCreateUser(auth);
    const photoUrl = await this.photos.saveUserPhoto(user.id, file);
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { photoUrl } }),
      this.prisma.player.updateMany({ where: { userId: user.id }, data: { photoUrl } }),
    ]);
    return this.me.toResponse(updated, auth);
  }

  async changePassword(auth: AuthUserPayload, dto: ChangePasswordDto): Promise<void> {
    const user = await this.me.getOrCreateUser(auth);
    const username = user.email ?? auth.email;
    if (!username) {
      throw new BadRequestException('Conta sem e-mail: não dá pra trocar a senha por aqui.');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('A nova senha precisa ser diferente da atual.');
    }
    const ok = await this.keycloak.verifyPassword(username, dto.currentPassword);
    if (!ok) {
      throw new BadRequestException('Senha atual incorreta.');
    }
    await this.keycloak.resetPassword(auth.sub, dto.newPassword);
  }
}
