import { IsString, MaxLength, MinLength } from 'class-validator';

/** Issue #226 — trocar senha pelo Meu perfil. */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha precisa ter pelo menos 8 caracteres.' })
  @MaxLength(128)
  newPassword!: string;
}
