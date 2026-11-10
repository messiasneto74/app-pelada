import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentLedgerDto {
  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsInt()
  @Min(0)
  amountCents!: number;
}
