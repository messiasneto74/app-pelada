import { PendingInviteService } from './pending-invite.service';

describe('PendingInviteService (issue #172)', () => {
  let service: PendingInviteService;

  beforeEach(() => {
    service = new PendingInviteService();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('guarda e consome o token uma única vez', () => {
    service.set('tok-abc');
    expect(service.consume()).toBe('tok-abc');
    expect(service.consume()).toBeNull();
  });

  it('sem token guardado, consume retorna null', () => {
    expect(service.consume()).toBeNull();
  });
});
