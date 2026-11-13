import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class PatchMatchFieldSessionDto {
  @IsOptional()
  @IsIn(['start', 'pause'])
  timer?: 'start' | 'pause';

  @IsOptional()
  @IsIn(['HOME', 'AWAY'])
  addGoal?: 'HOME' | 'AWAY';

  @IsOptional()
  @IsBoolean()
  undoGoal?: boolean;
}
