import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { GoalkeeperMode, PresenceMode } from '@prisma/client';

/** Parcial de regras válido em `Match.rulesOverride` (exceção vs padrão da pelada). */
export class PatchMatchRulesOverrideDto {
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(11)
  playersPerTeam?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(6)
  teamCount?: number;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsEnum(GoalkeeperMode)
  goalkeeperMode?: GoalkeeperMode;

  @IsOptional()
  @IsEnum(PresenceMode)
  presenceMode?: PresenceMode;

  @IsOptional()
  @IsObject()
  drawWeights?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
