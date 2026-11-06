import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type {
  MatchDrawDetailDto,
  PatchDrawSwapBody,
  PostMatchDrawBody,
} from './match-draw-api.model';

@Injectable({ providedIn: 'root' })
export class MatchDrawService {
  private readonly http = inject(HttpClient);

  private base(peladaId: string, matchId: string): string {
    return `${environment.apiUrl}/peladas/${peladaId}/matches/${matchId}/draw`;
  }

  getDraw(peladaId: string, matchId: string) {
    return this.http.get<MatchDrawDetailDto>(this.base(peladaId, matchId));
  }

  postDraw(
    peladaId: string,
    matchId: string,
    body: PostMatchDrawBody,
  ) {
    return this.http.post<MatchDrawDetailDto>(this.base(peladaId, matchId), body);
  }

  patchSwap(
    peladaId: string,
    matchId: string,
    body: PatchDrawSwapBody,
  ) {
    return this.http.patch<MatchDrawDetailDto>(
      `${this.base(peladaId, matchId)}/swap`,
      body,
    );
  }
}
