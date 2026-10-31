import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { ActivePelada } from '../pelada/active-pelada.model';
import type { PeladaPlayerProfileDto } from './pelada-player-profile-api.model';

@Injectable({ providedIn: 'root' })
export class PeladaPlayerProfileService {
  private readonly http = inject(HttpClient);

  loadProfile(
    pelada: ActivePelada,
    playerId: string,
    onResult: (profile: PeladaPlayerProfileDto | null) => void,
  ): void {
    this.http
      .get<PeladaPlayerProfileDto>(
        `${environment.apiUrl}/peladas/${pelada.id}/players/${playerId}`,
      )
      .subscribe({
        next: (dto) => onResult(dto),
        error: () => onResult(null),
      });
  }
}
