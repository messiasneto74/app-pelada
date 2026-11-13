import { IsIn, IsNumber, IsObject, IsOptional } from 'class-validator';

/** Corpo opcional de `pinnedByTeam`: chaves são índices do time (string ou número no JSON). */
export class PostMatchDrawDto {
  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @IsIn(['BALANCED', 'RANDOM'])
  mode?: 'BALANCED' | 'RANDOM';

  /**
   * Regerar com jogadores fixos por time — ex.: `{ "0": ["cuid1"], "1": ["cuid2"] }`.
   */
  @IsOptional()
  @IsObject()
  pinnedByTeam?: Record<string, string[]>;
}
