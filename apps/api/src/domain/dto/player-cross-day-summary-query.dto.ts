import { IsISO8601, IsOptional } from 'class-validator';

export class PlayerCrossDaySummaryQueryDto {
  /** Início do intervalo (inclusive). Sem filtro = desde o começo da pelada. */
  @IsOptional()
  @IsISO8601()
  since?: string;

  /** Fim do intervalo (inclusive). Sem filtro = até hoje. */
  @IsOptional()
  @IsISO8601()
  until?: string;
}
