import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { PeladaPaymentsService } from './pelada-payments.service';

describe('PeladaPaymentsService.createLedgerEntry (issue #190)', () => {
  let service: PeladaPaymentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PeladaPaymentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posta a cobrança com playerId, matchId opcional e amountCents', () => {
    service
      .createLedgerEntry('pel-1', {
        playerId: 'pl-1',
        matchId: 'm1',
        amountCents: 2000,
      })
      .subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/peladas/pel-1/payments/ledger`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      playerId: 'pl-1',
      matchId: 'm1',
      amountCents: 2000,
    });
    req.flush({});
  });

  it('posta a cobrança sem matchId (cobrança não ligada a uma partida)', () => {
    service
      .createLedgerEntry('pel-1', { playerId: 'pl-1', amountCents: 1500 })
      .subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/peladas/pel-1/payments/ledger`,
    );
    expect(req.request.body).toEqual({ playerId: 'pl-1', amountCents: 1500 });
    req.flush({});
  });
});
