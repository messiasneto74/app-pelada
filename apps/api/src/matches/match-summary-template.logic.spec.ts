import {
  DEFAULT_SUMMARY_TEMPLATE,
  readSummaryTemplate,
  renderSummaryTemplate,
} from './match-summary-template.logic';
import type { MatchDaySummaryDto } from './match-field-session.service';

function fullSummary(): MatchDaySummaryDto {
  return {
    matchId: 'm1',
    rounds: 2,
    teams: [],
    topScorer: { playerId: 'p1', displayName: 'Fulano', goals: 3 },
    biggestWin: {
      winnerDrawTeamId: 't1',
      winnerName: 'Time A',
      loserDrawTeamId: 't2',
      loserName: 'Time B',
      scoreWinner: 4,
      scoreLoser: 1,
      margin: 3,
    },
    mostLosses: { drawTeamId: 't2', name: 'Time B', losses: 2 },
    text: '',
  };
}

describe('readSummaryTemplate', () => {
  it('usa o padrão quando extra não tem summaryTemplate', () => {
    expect(readSummaryTemplate(null)).toBe(DEFAULT_SUMMARY_TEMPLATE);
    expect(readSummaryTemplate({})).toBe(DEFAULT_SUMMARY_TEMPLATE);
    expect(readSummaryTemplate({ summaryTemplate: '   ' })).toBe(
      DEFAULT_SUMMARY_TEMPLATE,
    );
  });

  it('usa o template customizado quando presente e não vazio', () => {
    expect(readSummaryTemplate({ summaryTemplate: 'oi {artilheiro}' })).toBe(
      'oi {artilheiro}',
    );
  });
});

describe('renderSummaryTemplate', () => {
  it('substitui todas as variáveis conhecidas', () => {
    const text = renderSummaryTemplate(DEFAULT_SUMMARY_TEMPLATE, fullSummary());
    expect(text).toBe(
      'Resumo do dia: 2 rodada(s). Artilheiro: Fulano (3 gol(s)). ' +
        'Maior goleada: Time A 4x1 Time B. Time que mais perdeu: Time B.',
    );
  });

  it('usa valores de fallback quando topScorer/biggestWin/mostLosses são null', () => {
    const empty: MatchDaySummaryDto = {
      matchId: 'm1',
      rounds: 0,
      teams: [],
      topScorer: null,
      biggestWin: null,
      mostLosses: null,
      text: '',
    };
    const text = renderSummaryTemplate(
      '{artilheiro}/{golsArtilheiro}/{timeGoleou}/{placarGoleada}/{timeQueMaisPerdeu}',
      empty,
    );
    expect(text).toBe('—/0/—/—/—');
  });

  it('mantém placeholder desconhecido como está (sem quebrar o texto)', () => {
    const text = renderSummaryTemplate('oi {inexistente}!', fullSummary());
    expect(text).toBe('oi {inexistente}!');
  });

  it('template livre sem nenhuma variável não é alterado', () => {
    const text = renderSummaryTemplate('Hoje foi uma pelada gigante!', fullSummary());
    expect(text).toBe('Hoje foi uma pelada gigante!');
  });
});
