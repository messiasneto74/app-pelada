import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ActivePelada } from '../pelada/active-pelada.model';
import type {
  CreatePeladaPlayerBody,
  PeladaRosterDto,
  PeladaRosterPlayerDto,
} from './pelada-roster-api.model';
import {
  buildEmptyRosterDto,
  mapRosterDto,
  mapRosterPlayerDto,
} from './pelada-roster.mapper';
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

  createPlayer(
    pelada: ActivePelada,
    body: CreatePeladaPlayerBody,
  ): Observable<RosterPlayer> {
    return this.http
      .post<PeladaRosterPlayerDto>(
        `${environment.apiUrl}/peladas/${pelada.id}/players`,
        body,
      )
      .pipe(map((dto) => mapRosterPlayerDto(dto)));
  }

  /** Lista "Convidados" (issue #172) — jogadores entrados por convite. */
  loadGuests(
    pelada: ActivePelada,
    onResult: (players: RosterPlayer[], outcome: RosterLoadOutcome) => void,
  ): void {
    this.http
      .get<PeladaRosterDto>(`${environment.apiUrl}/peladas/${pelada.id}/guests`)
      .subscribe({
        next: (dto) => onResult(mapRosterDto(dto), 'api'),
        error: () =>
          onResult(mapRosterDto(buildEmptyRosterDto(pelada.id)), 'fallback'),
      });
  }

  /** Promove um Convidado pra Jogador (issue #172 — fase 1: só manual). */
  promoteGuest(pelada: ActivePelada, playerId: string): Observable<RosterPlayer> {
    return this.http
      .post<PeladaRosterPlayerDto>(
        `${environment.apiUrl}/peladas/${pelada.id}/players/${playerId}/promote`,
        {},
      )
      .pipe(map((dto) => mapRosterPlayerDto(dto)));
  }
}
