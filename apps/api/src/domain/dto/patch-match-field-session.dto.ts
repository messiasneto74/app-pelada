import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class PatchMatchFieldSessionDto {
  @IsOptional()
  @IsIn(['start', 'pause'])
  timer?: 'start' | 'pause';

  @IsOptional()
  @IsIn(['HOME', 'AWAY'])
  addGoal?: 'HOME' | 'AWAY';

  /** Opcional — jogador que fez o gol (pro resumo/artilheiro). */
  @IsOptional()
  @IsString()
  goalPlayerId?: string;

  @IsOptional()
  @IsBoolean()
  undoGoal?: boolean;
}
