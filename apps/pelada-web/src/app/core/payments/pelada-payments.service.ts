import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type {
  LedgerGroupBy,
  PaymentLedgerEntryDto,
  PaymentLedgerResponse,
} from './payment-ledger-api.model';

@Injectable({ providedIn: 'root' })
export class PeladaPaymentsService {
  private readonly http = inject(HttpClient);

  private ledgerUrl(peladaId: string): string {
    return `${environment.apiUrl}/peladas/${peladaId}/payments/ledger`;
  }

  getLedger(peladaId: string, groupBy: LedgerGroupBy = 'player') {
    const params = new HttpParams().set('groupBy', groupBy);
    return this.http.get<PaymentLedgerResponse>(this.ledgerUrl(peladaId), {
      params,
    });
  }

  markPaid(peladaId: string, ledgerId: string) {
    return this.http.post<PaymentLedgerEntryDto>(
      `${environment.apiUrl}/peladas/${peladaId}/payments/${ledgerId}/mark-paid`,
      {},
    );
  }
}
