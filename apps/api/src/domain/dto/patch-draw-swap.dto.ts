import { IsString } from 'class-validator';

export class PatchDrawSwapDto {
  @IsString()
  playerAId!: string;

  @IsString()
  playerBId!: string;
}
