import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class MarkPaymentDto {
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;
}
