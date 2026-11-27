export type TieChoiceBody = { winner?: 'HOME' | 'AWAY'; method?: 'PAR_IMPAR' | 'PENALTIS' };
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type {
  MatchDaySummaryDto,
  MatchFieldSessionDto,
  PatchMatchFieldSessionBody,
  PostMatchFieldSessionBody,
} from './match-field-session-api.model';

@Injectable({ providedIn: 'root' })
export class MatchFieldSessionService {
  private readonly http = inject(HttpClient);

  private base(peladaId: string, matchId: string): string {
    return `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/field-session`;
  }

  getSession(peladaId: string, matchId: string) {
    return this.http.get<MatchFieldSessionDto>(this.base(peladaId, matchId));
  }

  startSession(
    peladaId: string,
    matchId: string,
    body: PostMatchFieldSessionBody = {},
  ) {
    return this.http.post<MatchFieldSessionDto>(this.base(peladaId, matchId), body);
  }

  patchSession(
    peladaId: string,
    matchId: string,
    body: PatchMatchFieldSessionBody,
  ) {
    return this.http.patch<MatchFieldSessionDto>(this.base(peladaId, matchId), body);
  }

  /** Issue #227 — no empate, manda quem venceu o desempate (se precisar). */
  endRound(peladaId: string, matchId: string, tie: TieChoiceBody = {}) {
    return this.http.post<MatchFieldSessionDto>(
      `${this.base(peladaId, matchId)}/end-round`,
      tie,
    );
  }

  finish(peladaId: string, matchId: string, tie: TieChoiceBody = {}) {
    return this.http.post<MatchFieldSessionDto>(
      `${this.base(peladaId, matchId)}/finish`,
      tie,
    );
  }

  getDaySummary(peladaId: string, matchId: string) {
    return this.http.get<MatchDaySummaryDto>(
      `${this.base(peladaId, matchId)}/summary`,
    );
  }
}
