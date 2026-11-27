import { IsIn, IsOptional } from 'class-validator';

/** Issue #227 — no empate, quem venceu o desempate (escolha do adm na tela). */
export class TieChoiceDto {
  @IsOptional()
  @IsIn(['HOME', 'AWAY'])
  winner?: 'HOME' | 'AWAY';

  @IsOptional()
  @IsIn(['PAR_IMPAR', 'PENALTIS'])
  method?: 'PAR_IMPAR' | 'PENALTIS';
}
