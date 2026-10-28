import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  queuePosition?: number;

  @IsOptional()
  @IsString()
  guestName?: string;
}
