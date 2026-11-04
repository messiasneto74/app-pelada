import { IsIn } from 'class-validator';

export class SelfAttendanceDto {
  @IsIn(['confirm', 'decline'])
  action!: 'confirm' | 'decline';
}
