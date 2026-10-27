import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PresenceMode } from '@prisma/client';

export class CreateMatchDto {
  @Type(() => Date)
  @IsDate()
  scheduledAt!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsEnum(PresenceMode)
  presenceMode?: PresenceMode;

  @IsOptional()
  @IsObject()
  rulesOverride?: Record<string, unknown>;
}
