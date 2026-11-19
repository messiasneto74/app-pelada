import { IsEmail, MaxLength } from 'class-validator';

/** Issue #179b — reenvia o convite já existente (mesmo token) por e-mail. */
export class SendInviteEmailDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
