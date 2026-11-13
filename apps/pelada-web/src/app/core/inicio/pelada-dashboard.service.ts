import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { ActivePelada } from '../pelada/active-pelada.model';
import {
  buildEmptyDashboardDto,
  mapDashboardToView,
} from './inicio-dashboard.mapper';
import type { InicioDashboardView, PeladaDashboardDto } from './inicio-dashboard.model';

@Injectable({ providedIn: 'root' })
export class PeladaDashboardService {
  private readonly http = inject(HttpClient);

  /** Evita `pipe` cross-rxjs (monorepo root vs workspace). */
  loadDashboard(
    pelada: ActivePelada,
    onResult: (view: InicioDashboardView) => void,
  ): void {
    this.http
      .get<PeladaDashboardDto>(
        `${environment.apiUrl}/peladas/${pelada.id}/dashboard`,
      )
      .subscribe({
        next: (dto) => onResult(mapDashboardToView(pelada, dto)),
        error: () =>
          onResult(
            mapDashboardToView(pelada, buildEmptyDashboardDto(pelada.id)),
          ),
      });
  }
}
