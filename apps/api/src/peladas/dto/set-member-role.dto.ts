import { IsIn } from 'class-validator';

/** Issue #232 — tornar adm / tirar adm. */
export class SetMemberRoleDto {
  @IsIn(['ORGANIZADOR', 'JOGADOR'])
  role!: 'ORGANIZADOR' | 'JOGADOR';
}
