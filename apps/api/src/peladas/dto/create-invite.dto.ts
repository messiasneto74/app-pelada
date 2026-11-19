import { IsEmail, IsOptional, MaxLength } from 'class-validator';

/** Issue #179b — e-mail opcional: quando presente, o convite também é enviado por e-mail. */
export class CreateInviteDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
