import { IsIn, IsOptional } from 'class-validator';

export class PostMatchFieldSessionDto {
  @IsOptional()
  @IsIn(['WINNER_STAYS', 'REST_QUEUE', 'SEQUENTIAL'])
  rotationPolicy?: 'WINNER_STAYS' | 'REST_QUEUE' | 'SEQUENTIAL';
}
