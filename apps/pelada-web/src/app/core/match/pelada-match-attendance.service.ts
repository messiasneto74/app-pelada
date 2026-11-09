import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Presença / lista — endpoints usados pela aba Partida (§3.4, 3.4-API).
 * Fechar lista na API é necessário antes do POST /draw (status LIST_CLOSED).
 */
@Injectable({ providedIn: 'root' })
export class PeladaMatchAttendanceService {
  private readonly http = inject(HttpClient);

  patchPlayer(
    peladaId: string,
    matchId: string,
    playerId: string,
    body: { status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'QUEUE'; queuePosition?: number },
  ) {
    return this.http.patch<{ playerId: string; status: string }>(
      `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/${playerId}`,
      body,
      { observe: 'body' },
    );
  }

  closeList(peladaId: string, matchId: string) {
    return this.http.post(
      `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/close-list`,
      {},
      { observe: 'body' },
    );
  }

  reopenList(peladaId: string, matchId: string) {
    return this.http.post(
      `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/reopen-list`,
      {},
      { observe: 'body' },
    );
  }
}
