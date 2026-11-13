import { IsString, MinLength } from 'class-validator';

export class GuestAttendanceRequestDto {
  @IsString()
  @MinLength(2)
  displayName!: string;
}
