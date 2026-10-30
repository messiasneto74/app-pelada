import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentPlan } from '@prisma/client';

export class PatchPlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
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
  @IsBoolean()
  isFixedList?: boolean;
}
