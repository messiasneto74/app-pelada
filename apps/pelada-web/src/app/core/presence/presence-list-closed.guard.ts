import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
  PARTIDA_PRESENCA_PATH,
} from './partida-sorteio-route';
import { PresenceSessionService } from './presence-session.service';

/** Sorteio só após lista fechada (§1 fluxo / 3.4-NAV). */
export const presenceListClosedGuard: CanActivateFn = () => {
  const session = inject(PresenceSessionService);
  const router = inject(Router);
  const matchId = session.getActiveMatchId();
  if (!matchId) {
    return router.createUrlTree([PARTIDA_PRESENCA_PATH]);
  }
  const snap = session.load(matchId);
  if (snap?.listClosed) {
    return true;
  }
  return router.createUrlTree([PARTIDA_PRESENCA_PATH]);
};
