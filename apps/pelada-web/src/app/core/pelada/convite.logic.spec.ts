import { HttpErrorResponse } from '@angular/common/http';
import { mapInvitePreviewError, mapInviteRedeemError } from './convite.logic';

function err(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

describe('mapInvitePreviewError (issue #172)', () => {
  it('404 — convite não encontrado', () => {
    expect(mapInvitePreviewError(err(404))).toContain('não encontrado');
  });

  it('410 — expirado ou já usado', () => {
    expect(mapInvitePreviewError(err(410))).toContain('não é mais válido');
  });

  it('0 — sem conexão', () => {
    expect(mapInvitePreviewError(err(0))).toContain('conectar');
  });

  it('outro status — mensagem genérica', () => {
    expect(mapInvitePreviewError(err(500))).toContain('Não foi possível');
  });
});

describe('mapInviteRedeemError (issue #172)', () => {
  it('409 — já é membro', () => {
    expect(mapInviteRedeemError(err(409))).toContain('já faz parte');
  });

  it('demais erros reaproveitam o preview', () => {
    expect(mapInviteRedeemError(err(410))).toContain('não é mais válido');
  });
});
