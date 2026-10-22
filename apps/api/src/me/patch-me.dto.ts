import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PatchMeDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[0-9+()\-\s]+$/, {
    message: 'phone must contain only digits and + ( ) - spaces',
  })
  phone?: string;
}
