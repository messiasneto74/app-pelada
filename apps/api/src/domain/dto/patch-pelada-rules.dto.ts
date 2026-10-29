import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { GoalkeeperMode, PresenceMode } from '@prisma/client';

export class PatchPeladaRulesDto {
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
  @IsInt()
  @Min(4)
  @Max(40)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  allowPlayerSelfEdit?: boolean;

  @IsOptional()
  @IsBoolean()
  fixedListOnly?: boolean;

  @IsOptional()
  @IsObject()
  drawWeights?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
