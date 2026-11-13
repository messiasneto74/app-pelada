import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import {
  buildDrawShareText,
  mapDrawToSorteioTeams,
  teamAverageLabel,
} from './sorteio-view.logic';

describe('sorteio-view.logic', () => {
  const roster = (overrides: Partial<RosterPlayer> = {}): RosterPlayer => ({
    id: 'p1',
    displayName: 'Jogador Um',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 7,
    tags: [],
    isFixedList: false,
    ...overrides,
  });

  it('teamAverageLabel formats BR decimal', () => {
    expect(teamAverageLabel([6.5, 7], 0)).toBe('6,5');
    expect(teamAverageLabel([6.5, 7], 1)).toBe('7,0');
  });

  it('mapDrawToSorteioTeams maps player ids to roster', () => {
    const draw: MatchDrawDetailDto = {
      drawId: 'd1',
      matchId: 'm1',
      balanceScore: 80,
      seed: '1',
      metrics: {
        balanceScore: 80,
        teamAverages: [6, 7],
        maxAverageDiff: 1,
        summaryText: 'Ok',
      },
      teams: [
        {
          id: 'ta',
          name: 'Time A',
          sortOrder: 0,
          playerIds: ['a', 'b'],
          players: [
            { playerId: 'a', sortOrder: 0 },
            { playerId: 'b', sortOrder: 1 },
          ],
        },
      ],
    };
    const map = new Map<string, RosterPlayer>([
      ['a', roster({ id: 'a', displayName: 'A' })],
      ['b', roster({ id: 'b', displayName: 'B' })],
    ]);
    const views = mapDrawToSorteioTeams(draw, map);
    expect(views.length).toBe(1);
    expect(views[0].players.map((p) => p.displayName)).toEqual(['A', 'B']);
    expect(views[0].averageLabel).toBe('6,0');
  });

  it('mapDrawToSorteioTeams usa placeholder quando elenco não veio da API', () => {
    const draw: MatchDrawDetailDto = {
      drawId: 'd1',
      matchId: 'm1',
      balanceScore: 50,
      seed: null,
      metrics: {
        balanceScore: 50,
        teamAverages: [7],
        maxAverageDiff: 0,
        summaryText: 'x',
      },
      teams: [
        {
          id: 't',
          name: 'Time A',
          sortOrder: 0,
          playerIds: ['id-desconhecido'],
          players: [{ playerId: 'id-desconhecido', sortOrder: 0 }],
        },
      ],
    };
    const views = mapDrawToSorteioTeams(draw, new Map());
    expect(views[0].players.length).toBe(1);
    expect(views[0].players[0].displayName).toContain('Jogador');
    expect(views[0].players[0].id).toBe('id-desconhecido');
  });

  it('buildDrawShareText can hide ratings', () => {
    const draw: MatchDrawDetailDto = {
      drawId: 'd1',
      matchId: 'm1',
      balanceScore: 80,
      seed: null,
      metrics: {
        balanceScore: 80,
        teamAverages: [7],
        maxAverageDiff: 0,
        summaryText: 'Equilíbrio bom',
      },
      teams: [
        {
          id: 't',
          name: 'Time A',
          sortOrder: 0,
          playerIds: ['a'],
          players: [{ playerId: 'a', sortOrder: 0 }],
        },
      ],
    };
    const m = new Map([['a', roster({ id: 'a', displayName: 'Zé', rating: 8 })]]);
    const withNotes = buildDrawShareText(draw, m, { hideRatings: false });
    expect(withNotes).toContain('nota 8');
    const noNotes = buildDrawShareText(draw, m, { hideRatings: true });
    expect(noNotes).not.toContain('nota');
  });
});
