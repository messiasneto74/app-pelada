import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Presença / lista — endpoints usados pela aba Partida (§3.4, 3.4-API).
 * Fechar lista na API é necessário antes do POST /draw (status LIST_CLOSED).
 */
export type MatchAttendanceStatusApi = 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'QUEUE';

/** `GET/PATCH .../attendance` e `POST .../attendance/self` — fonte de verdade da lista. */
export type MatchAttendanceListApiDto = {
  matchId: string;
  peladaId: string;
  listClosed: boolean;
  capacity: number;
  presenceMode: string | null;
  /** Issue #234 — regras DESTA partida pra montar a lista (vagas de goleiro e de espera). */
  goalkeeperSlots?: number;
  waitlistSlots?: number;
  entries: {
    playerId: string;
    status: MatchAttendanceStatusApi;
    queuePosition: number | null;
    isGuest: boolean;
    /** Issue #234 — ordem de chegada na lista numerada. */
    statusChangedAt?: string;
  }[];
};

@Injectable({ providedIn: 'root' })
export class PeladaMatchAttendanceService {
  private readonly http = inject(HttpClient);

  getList(peladaId: string, matchId: string) {
    return this.http.get<MatchAttendanceListApiDto>(
      `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance`,
    );
  }

  patchPlayer(
    peladaId: string,
    matchId: string,
    playerId: string,
    body: { status: MatchAttendanceStatusApi; queuePosition?: number },
  ) {
    return this.http.patch<MatchAttendanceListApiDto>(
      `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/${playerId}`,
      body,
      { observe: 'body' },
    );
  }

  setSelf(peladaId: string, matchId: string, action: 'confirm' | 'decline') {
    return this.http.post<MatchAttendanceListApiDto>(
      `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/attendance/self`,
      { action },
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
