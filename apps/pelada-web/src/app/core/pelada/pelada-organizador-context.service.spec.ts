import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PeladaOrganizadorContextService } from './pelada-organizador-context.service';

describe('PeladaOrganizadorContextService', () => {
  let service: PeladaOrganizadorContextService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PeladaOrganizadorContextService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('isOrganizador é false antes do GET membership', () => {
    expect(service.isOrganizador('pel-1')).toBe(false);
  });

  it('refreshMembership atualiza role da API', () => {
    service.refreshMembership('pel-1');
    const req = http.expectOne(
      `${environment.apiUrl}/peladas/pel-1/membership`,
    );
    req.flush({ peladaId: 'pel-1', role: 'ORGANIZADOR' });
    expect(service.isOrganizador('pel-1')).toBe(true);
  });

  it('refreshMembership com erro assume JOGADOR', () => {
    service.refreshMembership('pel-2');
    const req = http.expectOne(
      `${environment.apiUrl}/peladas/pel-2/membership`,
    );
    req.flush('err', { status: 403, statusText: 'Forbidden' });
    expect(service.isOrganizador('pel-2')).toBe(false);
  });
});
