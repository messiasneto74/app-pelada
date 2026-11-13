import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { CreateMatchRequestBody } from './create-match-form.logic';

export type CreatedMatchDto = {
  id: string;
  peladaId: string;
  scheduledAt: string;
  location: string | null;
  notes: string | null;
  presenceMode: string | null;
  status: string;
};

@Injectable({ providedIn: 'root' })
export class PeladaMatchCreateService {
  private readonly http = inject(HttpClient);

  createMatch(peladaId: string, body: CreateMatchRequestBody) {
    return this.http.post<CreatedMatchDto>(
      `${environment.apiUrl}/peladas/${peladaId}/matches`,
      body,
    );
  }
}
