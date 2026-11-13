import { IsIn, IsOptional, IsISO8601 } from 'class-validator';

export class PaymentLedgerQueryDto {
  @IsOptional()
  @IsIn(['player', 'match'])
  groupBy?: 'player' | 'match';

  /** Instante de referência do período (default: agora). */
  @IsOptional()
  @IsISO8601()
  at?: string;
}
