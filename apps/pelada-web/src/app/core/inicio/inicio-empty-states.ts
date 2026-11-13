import type { InicioDashboardView } from './inicio-dashboard.model';

/** §3.1 estados vazios — sem partida / sem jogadores (issue 3.1-EMPTY). */
export type InicioEmptyStates = {
  showNoMatch: boolean;
  showNoRoster: boolean;
};

export function resolveInicioEmptyStates(
  dash: Pick<InicioDashboardView, 'nextMatch' | 'rosterPlayerCount'>,
): InicioEmptyStates {
  return {
    showNoMatch: dash.nextMatch === null,
    showNoRoster: dash.rosterPlayerCount === 0,
  };
}
