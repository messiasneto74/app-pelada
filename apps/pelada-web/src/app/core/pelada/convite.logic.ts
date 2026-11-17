import { HttpErrorResponse } from '@angular/common/http';

/** Issue #172 (fase 1) — mensagens amigáveis pra tela de convite. */
export function mapInvitePreviewError(err: HttpErrorResponse): string {
  if (err.status === 404) {
    return 'Convite não encontrado. Confira o link ou peça um novo ao organizador.';
  }
  if (err.status === 410) {
    return 'Este convite não é mais válido (expirou ou já foi usado). Peça um novo link ao organizador.';
  }
  if (err.status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.';
  }
  return 'Não foi possível abrir este convite agora. Tente de novo em instantes.';
}

export function mapInviteRedeemError(err: HttpErrorResponse): string {
  if (err.status === 409) {
    return 'Você já faz parte desta pelada.';
  }
  return mapInvitePreviewError(err);
}
