import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PeladaMatchAttendanceService } from '../match/pelada-match-attendance.service';
import { PeladaContextService } from '../pelada/pelada-context.service';
import {
  PARTIDA_PRESENCA_PATH,
} from './partida-sorteio-route';
import { PresenceSessionService } from './presence-session.service';

/**
 * Sorteio só após lista fechada (§1 fluxo / 3.4-NAV).
 *
 * Caminho rápido: sessionStorage. Sem ele (app reaberto, outro aparelho, novo
 * login), pergunta à API — senão o organizador que já sorteou não conseguia
 * voltar pra Sorteio/Em campo e caía numa "Lista aberta" falsa.
 */
export const presenceListClosedGuard: CanActivateFn = () => {
  const session = inject(PresenceSessionService);
  const router = inject(Router);
  if (session.resolveMatchIdWithClosedList()) {
    return true;
  }
  const redirect = router.createUrlTree([PARTIDA_PRESENCA_PATH]);
  const pelada = inject(PeladaContextService).getActivePelada();
  if (!pelada) {
    return redirect;
  }
  const http = inject(HttpClient);
  const attendanceApi = inject(PeladaMatchAttendanceService);
  return http
    .get<{ nextMatch: { id: string } | null }>(
      `${environment.apiUrl}/peladas/${pelada.id}/dashboard`,
    )
    .pipe(
      switchMap((dash) => {
        const matchId = dash.nextMatch?.id;
        return matchId ? attendanceApi.getList(pelada.id, matchId) : of(null);
      }),
      map((list) => {
        if (list?.listClosed) {
          session.markListClosed(list.matchId);
          return true;
        }
        return redirect;
      }),
      catchError(() => of(redirect)),
    );
};
