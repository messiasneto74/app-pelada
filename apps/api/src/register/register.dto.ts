import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /** Nome e sobrenome — Keycloak 26 rejeita perfil incompleto no password grant. */
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/\S+\s+\S+/, {
    message: 'Informe nome e sobrenome',
  })
  name!: string;
}
