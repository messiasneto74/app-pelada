import type { MatchDaySummaryDto } from './match-field-session.service';

/**
 * Template padrão usado quando o organizador não configurou um texto próprio
 * em `PeladaRules.extra.summaryTemplate`. Nenhuma variável é obrigatória —
 * o organizador pode reescrever o texto do zero (até de brincadeira/"zoação")
 * e usar só as variáveis que quiser, ou nenhuma (decisão do Messias, épico #156).
 */
export const DEFAULT_SUMMARY_TEMPLATE =
  'Resumo do dia: {rodadas} rodada(s). Artilheiro: {artilheiro} ({golsArtilheiro} gol(s)). ' +
  'Maior goleada: {timeGoleou} {placarGoleada} {timeGoleado}. Time que mais perdeu: {timeQueMaisPerdeu}.';

export function readSummaryTemplate(extra: unknown): string {
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    const raw = (extra as Record<string, unknown>)['summaryTemplate'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw;
    }
  }
  return DEFAULT_SUMMARY_TEMPLATE;
}

/** Substitui `{variavel}` pelo valor correspondente; placeholder desconhecido é mantido como está. */
export function renderSummaryTemplate(
  template: string,
  summary: MatchDaySummaryDto,
): string {
  const vars: Record<string, string> = {
    rodadas: String(summary.rounds),
    artilheiro: summary.topScorer?.displayName ?? '—',
    golsArtilheiro: String(summary.topScorer?.goals ?? 0),
    timeGoleou: summary.biggestWin?.winnerName ?? '—',
    timeGoleado: summary.biggestWin?.loserName ?? '—',
    margemGol: String(summary.biggestWin?.margin ?? 0),
    placarGoleada: summary.biggestWin
      ? `${summary.biggestWin.scoreWinner}x${summary.biggestWin.scoreLoser}`
      : '—',
    timeQueMaisPerdeu: summary.mostLosses?.name ?? '—',
  };

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key]! : match,
  );
}
