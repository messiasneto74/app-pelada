import type { MatchFieldSessionDto } from '../../core/match/match-field-session-api.model';
import { displayElapsedMs } from './campo-view.logic';

/**
 * Intervalo de 1s no Angular é throttled com aba oculta — ao voltar, o `tick` precisa
 * acompanhar `Date.now()` para o cronômetro não ficar congelado (§3.6).
 */
export function catchUpTickMsOnPageVisible(nowMs: number): number {
  return nowMs;
}

/** Quanto o relógio exibido ficou para trás enquanto o tick local não atualizava. */
export function campoTimerDriftMs(
  session: Pick<MatchFieldSessionDto, 'elapsedMs' | 'timerRunning'>,
  lastTickMs: number,
  nowMs: number,
  anchorMs: number,
): number {
  if (!session.timerRunning) {
    return 0;
  }
  const painted = displayElapsedMs(session, lastTickMs, anchorMs);
  const actual = displayElapsedMs(session, nowMs, anchorMs);
  return Math.max(0, actual - painted);
}

/** Revalida sessão com o servidor após voltar do background (placar + elapsed snapshot). */
export function shouldResyncFieldSessionOnVisible(
  session: Pick<MatchFieldSessionDto, 'finishedAt'> | null,
): boolean {
  return session != null && session.finishedAt == null;
}
