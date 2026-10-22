import { IsString, MinLength } from 'class-validator';

/** DTO só para exercitar validação (e2e F0-3); removido quando houver rotas reais. */
export class ProbeValidateDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
