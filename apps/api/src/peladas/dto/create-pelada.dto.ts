import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePeladaDto {
  @IsString()
  @MinLength(2, { message: 'Informe um nome com pelo menos 2 caracteres.' })
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  defaultWeekday?: number;

  @IsOptional()
  @IsString()
  defaultLocation?: string;
}
