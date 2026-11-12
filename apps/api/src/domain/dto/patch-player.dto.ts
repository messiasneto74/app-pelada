import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentPlan } from '@prisma/client';
import { parseOptionalBoolean } from '../../common/parse-optional-boolean';

export class PatchPlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  isGoalkeeper?: boolean;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(PaymentPlan)
  paymentPlan?: PaymentPlan;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  isFixedList?: boolean;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, number>;
}
