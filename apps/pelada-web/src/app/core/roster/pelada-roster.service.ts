import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { ActivePelada } from '../pelada/active-pelada.model';
import type { PeladaRosterDto } from './pelada-roster-api.model';
import { buildEmptyRosterDto, mapRosterDto } from './pelada-roster.mapper';
import type { RosterPlayer } from './roster-player.model';

export type RosterLoadOutcome = 'api' | 'fallback';

@Injectable({ providedIn: 'root' })
export class PeladaRosterService {
  private readonly http = inject(HttpClient);

  loadRoster(
    pelada: ActivePelada,
    onResult: (players: RosterPlayer[], outcome: RosterLoadOutcome) => void,
  ): void {
    this.http
      .get<PeladaRosterDto>(
        `${environment.apiUrl}/peladas/${pelada.id}/players`,
      )
      .subscribe({
        next: (dto) => onResult(mapRosterDto(dto), 'api'),
        error: () =>
          onResult(mapRosterDto(buildEmptyRosterDto(pelada.id)), 'fallback'),
      });
  }
}
